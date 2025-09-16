import { Queue } from 'bullmq';

const queue = new Queue('Comick Manga Queue', {
  connection: {
    host: '127.0.0.1',
    port: 6379,
  },
}); // Comick Manga Queue or Get Manga Queue

async function findCompletedJobByMangaId(mangaId) {
  const completedJobs = await queue.getJobs(['completed'], 0, 1000); // default stored limit

  const job = completedJobs.find((job) => job.data.mangaId === mangaId);

  return job || null;
}

findCompletedJobByMangaId('401f7803-662e-447b-b7b1-76ec499b3e3e') //enter ID you want to find
  .then((job) => {
    if (job) {
      console.log('Found completed job:', job.id);
      console.log(job);
    } else {
      console.log('No completed job found for mangaId');
    }
  })
  .catch(console.error);
