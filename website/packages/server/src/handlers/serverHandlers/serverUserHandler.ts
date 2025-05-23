import { newUser } from '../../dataUtils/serverUtils';
import {Env, clerkUserSchema} from '../../types';
import { zodParse } from '../../utils';



export default async function userHandler(path: string[], request: Request, env: Env, userId: string) {
    console.log(path[1])
    switch (path[1]) {
        case 'new': 
            const body = await zodParse(request, clerkUserSchema)
            if (body instanceof Response) return body // returns zod errors

            return await newUser(body, env);
        default:
            return new Response('Not found', {status: 404}); 
    }
}
