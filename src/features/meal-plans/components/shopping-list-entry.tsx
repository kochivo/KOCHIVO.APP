'use client';
import type { ComponentProps } from 'react';
import { ShoppingList } from './shopping-list';
export function ShoppingListEntry(props: ComponentProps<typeof ShoppingList>) { return <ShoppingList {...props} />; }
