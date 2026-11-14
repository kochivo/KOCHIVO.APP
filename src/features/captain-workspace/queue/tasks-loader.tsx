'use client';
import dynamic from 'next/dynamic';
import { TasksState } from './tasks-state';
const Screen = dynamic(() => import('./tasks-screen').then(module => module.TasksScreen), { loading: () => <TasksState kind="loading" /> });
export function TasksLoader() { return <Screen />; }
