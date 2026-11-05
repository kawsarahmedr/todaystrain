import { childTicket } from './child-ticket';
import { eidTicket } from './eid-ticket';
import { eticketRegistration } from './eticket-registration';
import { luggageRules } from './luggage-rules';
import { onlineTicket } from './online-ticket';
import { readTimetable } from './read-timetable';
import { ticketRefund } from './ticket-refund';
import type { Guide } from './types';

export const GUIDES: Guide[] = [
  onlineTicket,
  eticketRegistration,
  ticketRefund,
  eidTicket,
  readTimetable,
  childTicket,
  luggageRules,
];

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug);
