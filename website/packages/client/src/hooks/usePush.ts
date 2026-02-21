// import { useState } from 'react';
// import {
//   // subscribeToPush,
//   unsubscribeFromPush,
//   sendTestNotification,
// } from '../push';

// export function usePush(subscriptionId: string) {
//   const [loading, setLoading] = useState(false);

//   async function subscribe() {
//     setLoading(true);
//     try {
//       await subscribeToPush(subscriptionId);
//     } finally {
//       setLoading(false);
//     }
//   }

//   async function unsubscribe() {
//     setLoading(true);
//     try {
//       await unsubscribeFromPush(subscriptionId);
//     } finally {
//       setLoading(false);
//     }
//   }

//   async function sendTest() {
//     setLoading(true);
//     try {
//       await sendTestNotification(subscriptionId);
//     } finally {
//       setLoading(false);
//     }
//   }

//   return {
//     subscribe,
//     unsubscribe,
//     sendTest,
//     loading,
//   };
// }
