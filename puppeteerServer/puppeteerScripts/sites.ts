import type { CheckResult, MangaQueueInsertResult, SiteQueue, SiteResolveResult } from '../types';

import { manganatoSite } from './mangaNato';
import { batoSite } from './bato';
import { mangadexSite } from './mangadex';
import { mangaparkSite } from './mangapark';
import { asuraSite } from './asuraV3';
import { mangafireSite } from './mangafire';
import { FlowProducer, Queue } from 'bullmq';
import config from '../config.json';
import { connection } from '../connections';
import { comixSite } from './comix';

const allSites: SiteQueue[] = [
  manganatoSite,
  batoSite,
  mangadexSite,
  mangaparkSite,
  asuraSite,
  mangafireSite,
  comixSite,
];

export const sites = allSites.filter((s) => s.enabled);

const flowProducer = new FlowProducer({
  connection,
});

export function resolveSiteForUrl(url: string): SiteResolveResult {
  const results = sites.map((site) => ({
    site,
    result: site.check(url),
  }));

  const passed = results.filter((r) => r.result.ok);
  console.log(passed);
  // Exactly one site matched
  if (passed.length === 1) {
    console.log('Found 1 Site! returning');
    return { ok: true, site: passed[0].site };
  }

  // Multiple matches is a configuration error
  if (passed.length > 1) {
    throw new Error(`Multiple sites matched URL: ${url}`);
  }

  // No matches → choose the furthest progressed failure
  const bestFailure = results
    .map((r) => r.result)
    .filter(isCheckFailure)
    .sort((a, b) => b.stage - a.stage)[0];

  return {
    ok: false,
    error: {
      url,
      reason: bestFailure.reason,
    },
  };
}
function isCheckFailure(
  result: CheckResult
): result is { ok: false; stage: number; reason: string } {
  return result.ok === false;
}

export async function addMangaBatch(
  urlList: string[],
  parentQueue: Queue
): Promise<MangaQueueInsertResult> {
  try {
    const successes: {
      url: string;
      site: SiteQueue;
    }[] = [];

    const failures: {
      url: string;
      reason: string;
    }[] = [];

    for (const url of urlList) {
      const result = resolveSiteForUrl(url);

      if (result.ok === false) {
        failures.push(result.error);
        continue;
      }

      successes.push({ url, site: result.site });
    }

    const children = successes.map(({ url, site }) => {
      return {
        name: `User Added: ${url}`,
        queueName: site.queue.name,
        data: {
          type: site.name,
          url: url.trim(),
          getIcon: true,
          update: false,
          maxCoverIndex: -1,
          maxSavedAt: 0,
        },
        opts: {
          priority: 1,
          removeOnComplete: config.queue.removeCompleted,
          removeOnFail: config.queue.removeFailed,
          name: site.name,
          timeout: 30_000,
          attempts: 2,
        },
      };
    });
    if (children.length > 0) {
      let jobs = await flowProducer.add({
        name: `User Batch at ${Date.now().toLocaleString()}`,
        queueName: 'user-bulk',
        data: {
          total: children.length,
        },
        opts: {
          failParentOnFailure: false,
          removeOnComplete: false,
          removeOnFail: false,
        },
        children,
      });

      return {
        batchId: jobs.job.id,
        enqueued: jobs.children.map((child) => ({
          url: child.job.data.url,
          fetchId: child.job.id,
        })),
        rejected: failures,
      };
    } else {
      return {
        batchId: '-1',
        enqueued: [],
        rejected: failures,
      };
    }
  } catch (err) {
    console.error(err);
  }
}
