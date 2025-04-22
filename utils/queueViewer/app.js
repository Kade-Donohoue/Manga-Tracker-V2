const express = require('express');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
const { createBullBoard } = require('@bull-board/api');
const { ExpressAdapter } = require('@bull-board/express');
const { Queue } = require('bullmq');
const path = require('path');

const connection = { host: '127.0.0.1', port: 6379 };

const getQueue = new Queue('Get Manga Queue', { connection });
const getComickQueue = new Queue('Comick Manga Queue', { connection });

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

// Create the Bull Board instance
createBullBoard({
  queues: [new BullMQAdapter(getQueue), new BullMQAdapter(getComickQueue)],
  serverAdapter,
});

const app = express();

// Custom API to fetch jobs sorted by processing time
app.get('/admin/api/sorted-jobs', async (req, res) => {
  try {
    const jobs = [...await getQueue.getJobs(['completed', 'failed']), ...await getComickQueue.getJobs(['completed', 'failed'])];

    const jobsWithProcessTime = jobs.map(job => {
      const processTime = job.finishedOn ? job.finishedOn - job.processedOn : null;
      return {
        id: job.id,
        name: job.name,
        data: job.data,
        processTime,
        status: job.isCompleted() ? 'completed' : 'failed',
      };
    });

    const sortedJobs = jobsWithProcessTime.sort((a, b) => {
      if (a.processTime === null) return 1;
      if (b.processTime === null) return -1;
      return a.processTime - b.processTime;
    }).reverse(); // Reverse the sorted jobs to get the most recent first

    res.json(sortedJobs);
  } catch (error) {
    console.error('Error fetching sorted jobs:', error);
    res.status(500).json({ error: 'Failed to fetch sorted jobs' });
  }
});

// Serve the static HTML file for /admin/sorted-jobs UI
app.get('/admin/sorted-jobs', (req, res) => {
  res.sendFile(path.join(__dirname, 'sorted-jobs.html'));
});

// Middleware to inject the button into the Bull Board dashboard
app.use('/admin/queues', (req, res, next) => {
  const originalSend = res.send;
  res.send = function (body) {
    const modifiedBody = body.toString().replace(
      '</body>',
      `<div style="position: fixed; bottom: 50px; left: 10px; z-index:9999;">
         <a href="/admin/sorted-jobs" style="background-color: #007bff; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">
           View Sorted Jobs
         </a>
       </div></body>`
    );
    originalSend.call(this, modifiedBody);
  };
  next();
});

// Use the Bull Board adapter's router
app.use('/admin/queues', serverAdapter.getRouter());

app.listen(5911, () => {
  console.log('Bull Board is running on port 5911');
});
