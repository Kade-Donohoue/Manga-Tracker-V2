export default {
	async fetch(_request: Request, env: any) {
		try {
			const url = new URL(_request.url);
			const path = url.pathname;

			if (path === '/manga') await migrateManga(env);
			else if (path === '/user') {
				const params = url.searchParams;
				const oldId = params.get('oldId');
				const newId = params.get('newId');
				if (!oldId || !newId) return new Response(JSON.stringify({ message: 'Missing Params, oldId, newId' }), { status: 400 });

				console.log({ oldId, newId });

				await migrateUser(oldId, newId, env);
			} else return new Response(JSON.stringify({ message: 'Not Found' }), { status: 404 });

			return new Response(`Migration complete!`, {
				status: 200,
			});
		} catch (err) {
			console.error(err);
			return new Response('Migration failed: ' + err, { status: 500 });
		}
	},
} satisfies ExportedHandler<Env>;

async function migrateManga(env: any) {
	// --------------------
	// mangaData
	// --------------------
	const oldMangaData = await env.OLD_DB.prepare(
		`SELECT *
FROM mangaData m
WHERE EXISTS (
  SELECT 1
  FROM userData u
  WHERE u.mangaId = m.mangaId
)`
	).all();
	if (!oldMangaData.results?.length) return;

	const batchSize = 100;
	const total = oldMangaData.results.length;

	const conflicts: { sourceId: string; existingMangaId: string; newMangaId: string }[] = [];

	for (let start = 0; start < total; start += batchSize) {
		const batch = oldMangaData.results.slice(start, start + batchSize);

		const sourceIdMap = new Map<string, (typeof batch)[0]>();
		for (const m of batch) {
			const sourceId = generateSourceId(m);
			sourceIdMap.set(sourceId, m);
		}

		const placeholders = Array.from(sourceIdMap.keys())
			.map(() => '?')
			.join(',');
		const existing = await env.NEW_DB.prepare(`SELECT mangaId, sourceId FROM mangaData WHERE sourceId IN (${placeholders})`)
			.bind(...sourceIdMap.keys())
			.all();

		if (existing.results?.length) {
			for (const row of existing.results) {
				const newRow = sourceIdMap.get(row.sourceId);
				if (newRow) {
					if (row.mangaId !== newRow.mangaId) {
						conflicts.push({
							sourceId: row.sourceId,
							existingMangaId: row.mangaId,
							newMangaId: newRow.mangaId,
						});
					}
				}
			}
		}
	}

	if (conflicts.length) {
		console.log('Conflicts detected for sourceIds:');
		for (const c of conflicts) {
			console.log('================================\n================================');
			console.log(`sourceId: ${c.sourceId}, mangaId = '${c.existingMangaId}' OR mangaId = '${c.newMangaId}'`);
			c;
			console.log(`
SQL to Fix? Please double check before running:

-- Update userData
UPDATE userData
SET mangaId = '${c.newMangaId}'
WHERE mangaId = '${c.existingMangaId}';

-- Update userStats
UPDATE userStats
SET mangaId = '${c.newMangaId}'
WHERE mangaId = '${c.existingMangaId}';

-- Delete old cover images
DELETE FROM coverImages
WHERE mangaId = '${c.existingMangaId}';

-- Delete old manga data
DELETE FROM mangaData
WHERE mangaId = '${c.existingMangaId}';
`);
		}
		throw new Error(`Conflicts detected for ${conflicts.length}/${oldMangaData.results?.length} sourceIds. No data was inserted.`);
	}

	for (let i = 0; i < total; i++) {
		const m = oldMangaData.results[i];
		const sourceId = generateSourceId(m);

		// console.log(`[${i + 1}/${total}]`, m.mangaId, sourceId);

		await env.NEW_DB.prepare(
			`INSERT INTO mangaData
         (mangaId, mangaName, urlBase, slugList, chapterTextList, latestChapterText, updateTime, useAltStatCalc, specialFetchData, sourceId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
			.bind(
				m.mangaId,
				m.mangaName,
				m.urlBase,
				m.slugList,
				m.chapterTextList,
				m.latestChapterText ?? -1,
				m.updateTime,
				m.useAltStatCalc ? 1 : 0,
				m.specialFetchData || null,
				sourceId
			)
			.run();
	}

	console.log('mangaData Done!');

	// --------------------
	// coverImages
	// --------------------
	const oldCovers = await env.OLD_DB.prepare(
		`SELECT mangaId, coverIndex, savedAt FROM coverImages c 
   WHERE EXISTS (
     SELECT 1
     FROM userData u
     WHERE u.mangaId = c.mangaId
   )`
	).all();

	if (oldCovers.results?.length) {
		console.log(oldCovers.results?.length);
		const batchSize = 20; // adjust as needed
		for (let i = 0; i < oldCovers.results.length; i += batchSize) {
			const batch = oldCovers.results.slice(i, i + batchSize);

			// build the placeholders and bind values
			const placeholders = batch.map(() => `(?, ?, ?)`).join(', ');
			const values: any[] = [];
			batch.forEach((c: any) => values.push(c.mangaId, c.coverIndex, c.savedAt));

			const sql = `INSERT INTO coverImages (mangaId, coverIndex, savedAt) VALUES ${placeholders} ON CONFLICT DO NOTHING`;

			await env.NEW_DB.prepare(sql)
				.bind(...values)
				.run();
		}
	}

	console.log('coverImages Done!');
}

async function migrateUser(oldId: string, newId: string, env: any) {
	// --------------------
	// userCategories
	// --------------------
	const oldCategories = await env.OLD_DB.prepare(`SELECT * FROM userCategories WHERE userID = ?`).bind(oldId).all();
	if (oldCategories.results?.length) {
		for (const c of oldCategories.results) {
			await env.NEW_DB.prepare(
				`INSERT INTO userCategories
             (userID, label, value, color, stats, public, position)
             VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING`
			)
				.bind(newId, c.label, c.value, c.color, c.stats ? 1 : 0, c.public ? 1 : 0, c.position)
				.run();
		}
		// total += oldCategories.results.length;
	}

	console.log('userCats Done!');

	// --------------------
	// userData
	// --------------------
	const oldUserData = await env.OLD_DB.prepare(`SELECT * FROM userData WHERE userID = ?`).bind(oldId).all();
	if (oldUserData.results?.length) {
		for (const row of oldUserData.results) {
			console.log(row);
			await env.NEW_DB.prepare(
				`INSERT INTO userData
             (userID, mangaId, userTitle, currentIndex, currentChap, userCat, interactTime, userCoverIndex)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
			)
				.bind(
					newId,
					row.mangaId,
					row.userTitle || null,
					row.currentIndex,
					row.currentChap,
					row.userCat,
					row.interactTime,
					row.userCoverIndex ?? -1
				)
				.run();
		}
		// total += oldUserData.results.length;
	}

	console.log('userData Done!');
}

function generateSourceId(mangaRow: any) {
	const urlBase = mangaRow.urlBase || '';

	let sourceId: string | null = null;

	if (urlBase.toLowerCase().includes('asura')) {
		sourceId = urlBase.split('-').at(-1).split('/')[0] || null;
	} else if (urlBase.includes('bato')) {
		sourceId = null;
	} else if (urlBase.includes('mangadex')) {
		sourceId = mangaRow.specialFetchData || null;
	} else if (urlBase.includes('mangafire')) {
		sourceId = urlBase.split('.').at(-1).split('/')[0] || null;
	} else if (urlBase.includes('manganato')) {
		sourceId = urlBase.split('/').at(-2) || null;
	} else if (urlBase.includes('mangapark')) {
		const match = urlBase.match(/title\/(\d+)[^/]*\/(\d+)/);
		if (match) {
			const [, comicId] = match;
			sourceId = comicId || null;
		}
	}

	if (!sourceId) {
		console.warn(`Cannot generate sourceId for manga: ${mangaRow.mangaName}`);
		sourceId = `MISSING_${mangaRow.mangaName.replace(/\s+/g, '_')}`;
	}

	return sourceId;
}
