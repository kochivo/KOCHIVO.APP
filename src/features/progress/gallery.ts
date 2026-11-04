export const poses = ['front', 'side', 'back'] as const;
export type PhotoPose = typeof poses[number];
export type GalleryPose = PhotoPose | 'photo';
export interface GalleryWeek {
  date: string;
  weight: number | null;
  photos: { url: string; pose: GalleryPose }[];
}

export function photoPose(value: string | undefined): GalleryPose {
  return poses.find(pose => pose === value) ?? 'photo';
}

export function compareWeeks(weeks: readonly GalleryWeek[], first: string, second: string, pose: string) {
  if (first === second) return null;
  const selected = weeks.filter(week => week.date === first || week.date === second)
    .sort((a, b) => a.date.localeCompare(b.date));
  const before = selected[0];
  const after = selected[1];
  if (!before || !after || !before.photos.some(photo => photo.pose === pose) || !after.photos.some(photo => photo.pose === pose)) return null;
  return { before, after, delta: before.weight === null || after.weight === null ? null :
    Math.round((after.weight - before.weight) * 10) / 10 };
}
