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

const queues = [getQueue, getComickQueue].map((queue, idx) => {
  const adapter = new BullMQAdapter(queue);

  // Optional: format job name with queue info
  adapter.setFormatter('name', (job) => `${job.name} - ${job.data.mangaId}`);

  // Custom sanitize job.data
  adapter.setFormatter('data', (data) => {
    if (data?.images) {
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

  // Custom sanitize job.returnValue
  adapter.setFormatter('returnValue', (rv) => {
    if (rv?.images) {
      return {
        ...rv,
        images: rv.images.map((img) => ({
          ...img,
          image: `[Image data: ${img.image?.data?.length ?? 0} bytes]`,
        })),
      };
    }
    return rv;
  });

  return adapter;
});


// Create the Bull Board instance
createBullBoard({
  queues,
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
        `<div style="position: fixed; bottom: 50px; left: 10px; z-index:9999; display:flex; flex-direction: column; gap:10px;">
           <a href="/admin/sorted-jobs" style="background-color:#007bff;color:white;padding:10px 15px;text-decoration:none;border-radius:5px;">
            View Sorted Jobs
            </a>
            <a href="/admin/search-manga" style="background-color:#28a745;color:white;padding:10px 15px;text-decoration:none;border-radius:5px;">
              Search by Manga ID
            </a>
       </div></body>`
    );
    originalSend.call(this, modifiedBody);
  };
  next();
});

// Serve the search UI
app.get('/admin/search-manga', (req, res) => {
  res.sendFile(path.join(__dirname, 'search-manga.html'));
});


app.get('/admin/api/jobs-by-mangaId', async (req, res) => {
  try {
    const { mangaId } = req.query;
    if (!mangaId) {
      return res.status(400).json({ error: 'mangaId query parameter is required' });
    }

    const jobStates = ['waiting', 'active', 'completed', 'failed', 'delayed'];

    const jobs = [
      ...(await getQueue.getJobs(jobStates)),
      ...(await getComickQueue.getJobs(jobStates)),
    ];

    const filtered = jobs
      .filter(job => job.data?.mangaId?.toString() === mangaId.toString())
      .map(job => ({
        id: job.id,
        name: job.name,
        data: job.data,
        status: job.finishedOn
          ? (job.failedReason ? 'failed' : 'completed')
          : 'pending',
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
      }));

    res.json(filtered);
  } catch (error) {
    console.error('Error fetching jobs by mangaId:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});


// Use the Bull Board adapter's router
app.use('/admin/queues', serverAdapter.getRouter());

app.listen(5911, () => {
  console.log('Bull Board is running on port 5911');
});
