/// <reference types="@cloudflare/workers-types" />
import { handleContact, type ContactEnv } from '../../server/contact-handler';

// POST /api/contact — every other method gets a JSON 405 from the handler.
export const onRequest: PagesFunction<ContactEnv> = (context) =>
  handleContact(context.request, context.env);
