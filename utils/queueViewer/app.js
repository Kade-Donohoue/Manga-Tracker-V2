const express = require('express');
const path = require('path');

const { Queue } = require('bullmq');
const { createBullBoard } = require('@bull-board/api');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
const { ExpressAdapter } = require('@bull-board/express');

const app = express();

const connection = {
  host: '127.0.0.1',
  port: 6379,
};

const queueNames = [
  'Manganato-site',
  'Mangadex-site',
  'asura-site',
  'Mangafire-site',
  'auto-update',
  'user-bulk',
  'comix-site',
];

// Create BullMQ queues
const baseQueues = queueNames.map(
  (queueName) => new Queue(queueName, { connection })
);

// Keep the queues available for the custom APIs
const queueMap = new Map(
  baseQueues.map((queue) => [queue.name, queue])
);

// -----------------------------------------------------------------------------
// Bull Board
// -----------------------------------------------------------------------------

const serverAdapter = new ExpressAdapter();

serverAdapter.setBasePath('/admin/queues');

const queues = baseQueues.map((queue) => {
  const adapter = new BullMQAdapter(queue);

  // Format job name
  adapter.setFormatter('name', (job) => job.name);

  // Sanitize job.data
  adapter.setFormatter('data', (data) => {
    if (data?.images && Array.isArray(data.images)) {
      return {
        ...data,
        images: data.images.map((img) => ({
          ...img,
          image: `[Image data: ${img.image?.data?.length ?? 0} bytes]`,
        })),
      };
    }

    return data;
  });

  // Sanitize job.returnValue
  adapter.setFormatter('returnValue', (returnValue) => {
    if (returnValue?.images && Array.isArray(returnValue.images)) {
      return {
        ...returnValue,
        images: returnValue.images.map((img) => ({
          ...img,
          image: `[Image data: ${img.image?.data?.length ?? 0} bytes]`,
        })),
      };
    }

    return returnValue;
  });

  return adapter;
});

createBullBoard({
  queues,
  serverAdapter,
  options: {
    uiConfig: {
      boardTitle: 'Manga Tracker Queue Viewer',
      hideDocsLink: true,
      miscLinks: [
        {
          text: 'View Sorted Jobs',
          url: '/admin/sorted-jobs',
        },
        {
          text: 'Search by Manga ID',
          url: '/admin/search-manga',
        },
      ],
    },
  },

});

// -----------------------------------------------------------------------------
// Custom API - Sorted Jobs
// -----------------------------------------------------------------------------

app.get('/admin/api/sorted-jobs', async (req, res) => {
  try {
    const jobs = [];

    for (const queue of baseQueues) {
      const queueJobs = await queue.getJobs([
        'completed',
        'failed',
      ]);

      jobs.push(...queueJobs);
    }

    const jobsWithProcessTime = jobs.map((job) => {
      const processTime =
        job.finishedOn && job.processedOn
          ? job.finishedOn - job.processedOn
          : null;

      return {
        id: job.id,
        queueName: job.queueName,
        name: job.name,
        data: job.data,
        processTime,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
        status: job.failedReason ? 'failed' : 'completed',
      };
    });

    const sortedJobs = jobsWithProcessTime
      .sort((a, b) => {
        if (a.processTime === null) return 1;
        if (b.processTime === null) return -1;

        return a.processTime - b.processTime;
      })
      .reverse();

    res.json(sortedJobs);
  } catch (error) {
    console.error('Error fetching sorted jobs:', error);

    res.status(500).json({
      error: 'Failed to fetch sorted jobs',
    });
  }
});

// -----------------------------------------------------------------------------
// Sorted Jobs UI
// -----------------------------------------------------------------------------

app.get('/admin/sorted-jobs', (req, res) => {
  res.sendFile(path.join(__dirname, 'sorted-jobs.html'));
});

// -----------------------------------------------------------------------------
// Search Manga UI
// -----------------------------------------------------------------------------

app.get('/admin/search-manga', (req, res) => {
  res.sendFile(path.join(__dirname, 'search-manga.html'));
});

// -----------------------------------------------------------------------------
// Custom API - Jobs by Manga ID
// -----------------------------------------------------------------------------

app.get('/admin/api/jobs-by-mangaId', async (req, res) => {
  try {
    const { mangaId } = req.query;

    if (!mangaId) {
      return res.status(400).json({
        error: 'mangaId query parameter is required',
      });
    }

    const jobStates = [
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed',
    ];

    const jobs = [];

    // Search every configured queue
    for (const queue of baseQueues) {
      const queueJobs = await queue.getJobs(jobStates);
      jobs.push(...queueJobs);
    }

    const mangaIdString = mangaId.toString();

    const filtered = jobs
      .filter(
        (job) =>
          job.data?.mangaId?.toString() === mangaIdString
      )
      .map((job) => ({
        id: job.id,
        queueName: job.queueName,
        name: job.name,
        data: job.data,

        status: job.finishedOn
          ? job.failedReason
            ? 'failed'
            : 'completed'
          : 'pending',

        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
      }));

    res.json(filtered);
  } catch (error) {
    console.error('Error fetching jobs by mangaId:', error);

    res.status(500).json({
      error: 'Failed to fetch jobs',
    });
  }
});

// -----------------------------------------------------------------------------
// Bull Board Router
// -----------------------------------------------------------------------------

app.use('/admin/queues', serverAdapter.getRouter());

// -----------------------------------------------------------------------------
// Start server
// -----------------------------------------------------------------------------

const PORT = 5911;

app.listen(PORT, () => {
  console.log(`Bull Board is running on port ${PORT}`);
  console.log(`Dashboard: http://localhost:${PORT}/admin/queues`);
});
