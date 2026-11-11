'use client';
import type { ComponentProps } from 'react';
import { QuestionField } from './question-field';

export function QuestionFieldEntry(props: ComponentProps<typeof QuestionField>) {
  return <QuestionField {...props} />;
}
