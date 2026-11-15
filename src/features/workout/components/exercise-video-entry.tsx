'use client';
import { ExerciseVideo as Video } from './exercise-video';

export function ExerciseVideo(props: { url?: string | null; name: string; compact?: boolean }) {
  return <Video key={props.url} {...props} />;
}
