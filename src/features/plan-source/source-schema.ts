import { z } from 'zod';

export const workbookSourceSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  sheets: z.array(z.object({
    name: z.string().trim().min(1).max(31),
    rows: z.array(z.array(z.string().max(12000)).max(128)).max(1500),
  })).min(1).max(24),
}).refine(source => new TextEncoder().encode(JSON.stringify(source)).byteLength <= 370000);
export type WorkbookSource = z.infer<typeof workbookSourceSchema>;
