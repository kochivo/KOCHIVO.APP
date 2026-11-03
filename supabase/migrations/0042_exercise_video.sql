alter table public.exercises add column video_url text
  constraint exercises_video_url_check check (
    video_url is null or (video_url like 'https://%' and char_length(video_url) <= 500)
  );
