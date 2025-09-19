import { Job } from 'bullmq';

import config from './config.json';
import { getManga as getManganato } from './puppeteerScripts/mangaNato';
import { getManga as getAsura } from './puppeteerScripts/asuraV3';
import { getManga as getMangadex } from './puppeteerScripts/mangadex';
import { getManga as getComick } from './puppeteerScripts/comick';
import { getManga as getMangafire } from './puppeteerScripts/mangafire';

export default async function (job: Job) {
  if (config.logging.verboseLogging) console.log('starting job \n' + job.data);
  switch (job.data.type) {
    case 'manganato':
      return await getManganato(
        job.data.url,
        job.data.getIcon,
        job.data.update,
        job.data.coverIndexes,
        job.data.maxSavedAt,
        job
      );
    case 'mangadex':
      return await getMangadex(
        job.data.url,
        job.data.getIcon,
        job.data.update,
        job.data.coverIndexes,
        job.data.maxSavedAt,
        job
      );
    case 'asura':
      return await getAsura(
        job.data.url,
        job.data.getIcon,
        job.data.update,
        job.data.coverIndexes,
        job.data.maxSavedAt,
        job
      );
    case 'comick':
      return await getComick(
        job.data.url,
        job.data.getIcon,
        job.data.update,
        job.data.maxCoverIndex,
        job.data.coverIndexes,
        job.data.specialFetchData,
        job
      );
    case 'mangafire':
      return await getMangafire(
        job.data.url,
        job.data.getIcon,
        job.data.update,
        job.data.coverIndexes,
        job.data.maxSavedAt,
        job
      );
    default:
      console.log('Unknown get manga job: ' + job.data.type);
      throw new Error('Invalid Job Type!');
  }
}
