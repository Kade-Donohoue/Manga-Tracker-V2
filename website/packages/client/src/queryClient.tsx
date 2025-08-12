import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { toast } from 'react-toastify';

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.meta?.disableToast) return;

      const message:string =
        query.meta?.errorMessage as string ??
        (error instanceof Error ? error.message : 'An unknown error occurred.');

      if (query.state.data !== undefined) {
        toast.error(message);
      } else {
        toast.error(message);
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (mutation.meta?.disableToast) return;

      const message:string =
        mutation.meta?.errorMessage as string ??
        (error instanceof Error ? error.message : 'Something went wrong.');

      toast.error(message);
    },
    onSuccess: (_data, _variables, _context, mutation) => {
      if (mutation.meta?.successMessage) {
        toast.success(mutation.meta.successMessage as string);
      }
    },
  }),
});
