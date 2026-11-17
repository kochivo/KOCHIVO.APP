'use client';
import { useCallback, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useT } from '@/core/i18n/client';
import { useResource } from '@/core/resource';
import { Button } from '@/ui/button';
import { Chip } from '@/ui/chip';
import { Disclosure } from '@/ui/disclosure';
import { LoadingState } from '@/ui/loading-state';
import { Segmented } from '@/ui/segmented';
import { Search } from 'lucide-react';
import { PageBarTitle } from '@/ui/page-bar-title';
import { PageBarActions } from '@/ui/page-bar-actions';
import { KoPlus } from '@/ui/icons/ko-plus';
import { useToast } from '@/ui/toast';
import { foodResourceKey } from '../../data/food-resource-version';
import { loadFoodLibrary, setFoodFavorite } from '../../data/library-v2';
import type { Food } from '../../types';
import type { LibraryFood } from '../../data/library-types';
import { messages } from './v2/messages';
import { messages as baseMessages } from './messages';
import { filterFoods, nutrients, regions } from './library-model';
import type { NutritionFilter, RegionFilter } from './library-model';
import { FoodResults } from './food-results';
import { LibraryStats } from './library-stats';
const FoodDrawer = dynamic(() => import('./food-drawer').then(module => module.FoodDrawer), { loading: () => <LoadingState variant="detail" /> });
const RecipeBuilder = dynamic(() => import('./recipe-builder').then(module => module.RecipeBuilder), { loading: () => <LoadingState variant="detail" /> });
const AddToPlan = dynamic(() => import('./add-to-plan').then(module => module.AddToPlan), { loading: () => <LoadingState variant="detail" /> });

export function LibraryWorkspace() {
  const t = useT(messages), bt = useT(baseMessages), toast = useToast();
  const [query, setQuery] = useState(''), [region, setRegion] = useState<RegionFilter>('all');
  const [nutrition, setNutrition] = useState<NutritionFilter[]>([]);
  const [cards, setCards] = useState(false), [page, setPage] = useState(0);
  const [selected, setSelected] = useState<LibraryFood | null | undefined>();
  const [recipe, setRecipe] = useState(false), [add, setAdd] = useState<{ food: Food; grams: number }>();
  const pending = useRef(new Set<string>());
  const load = useCallback(() => loadFoodLibrary(), []);
  const resource = useResource(foodResourceKey('foods-library-v2'), load);
  const foods = resource.data?.foods ?? [];
  const favorites = useMemo(() => new Set(resource.data?.favorites ?? []), [resource.data?.favorites]);
  const filtered = filterFoods(foods, query, region, nutrition, favorites) as LibraryFood[];
  const regional = region === 'all' || region === 'mine' || region === 'favorites' ? 'eg' : region;
  const changeRegion = (key: RegionFilter) => { setRegion(key); setPage(0); };
  async function favorite(id: string) {
    if (pending.current.has(id)) return;
    pending.current.add(id);
    try {
      const success = await resource.mutate(current => ({ foods: current?.foods ?? [], favorites: favorites.has(id) ? (current?.favorites ?? []).filter(value => value !== id) : [...current?.favorites ?? [], id] }), async () => {
        const result = await setFoodFavorite(id, !favorites.has(id));
        if (!result.ok) throw new Error(result.error);
      });
      if (!success) toast.error(bt('error'));
    } catch { toast.error(bt('error')); }
    finally { pending.current.delete(id); }
  }
  return <section className="grid min-w-0 gap-card-gap">
    <PageBarTitle title={t('title')} subtitle={resource.data ? t('count', { count: foods.length }) : t('subtitle')} /><PageBarActions><Button variant="secondary" onClick={() => setRecipe(true)}>{t('recipeNew')}</Button><Button id="new-library-food" onClick={() => setSelected(null)}><KoPlus aria-hidden className="size-5" />{bt('new')}</Button></PageBarActions>
    <div className="flex min-w-0 flex-wrap items-center gap-stack">
      <label className="flex min-h-12 w-full min-w-0 items-center gap-inline rounded-control border border-line-soft bg-bg-deep px-stack min-[760px]:w-auto">
        <span className="sr-only">{bt('search')}</span><Search aria-hidden className="size-4 shrink-0 text-muted" />
        <input type="search" className="min-h-12 min-w-0 flex-1 bg-transparent text-sm" maxLength={100} placeholder={bt('search')} value={query} onChange={event => { setQuery(event.target.value); setPage(0); }} />
      </label>
      <Segmented aria-label={t('type')} value={region} className="max-w-full flex-wrap" options={[
        { value: 'all', label: t('all') }, { value: regional, label: t(regional) }, { value: 'mine', label: t('mine') }, { value: 'favorites', label: t('favorites') },
      ]} onChange={value => { const next = regions.find(key => key === value); if (next) changeRegion(next); }} />
    </div>
    <Disclosure label={t('moreFilters')} className="text-sm text-muted">
      <div className="grid gap-stack">
        <div className="flex flex-wrap items-center gap-inline"><span className="text-xs text-muted">{t('examples')}</span>{(['chicken', 'bread', 'meat'] as const).map(key => <Chip key={key} pressed={query === t(key)} onClick={() => { setQuery(t(key)); setPage(0); }}>{t(key)}</Chip>)}</div>
        <div className="flex flex-wrap gap-inline">{regions.filter(key => key !== 'all' && key !== 'mine' && key !== 'favorites').map(key =>
          <Chip key={key} pressed={region === key} onClick={() => changeRegion(key)}>{t(key)}</Chip>)}</div>
        <div className="flex flex-wrap gap-inline">{nutrients.map(key => <Chip key={key} pressed={nutrition.includes(key)} onClick={() => { setNutrition(value => value.includes(key) ? value.filter(item => item !== key) : [...value, key]); setPage(0); }}>{t(key)}</Chip>)}
          <div className="ms-auto flex gap-inline">{(['table', 'cards'] as const).map(key => <Button key={key} variant="secondary" aria-pressed={cards === (key === 'cards')} onClick={() => setCards(key === 'cards')}>{t(key)}</Button>)}</div>
        </div>
      </div>
    </Disclosure>
    {(resource.status === 'loading' || resource.status === 'idle') && <LoadingState variant="list" />}
    {Boolean(resource.error) && <div role="alert"><p>{bt('error')}</p><Button variant="secondary" onClick={() => void resource.retry()}>{bt('retry')}</Button></div>}
    {resource.data && <><p className="text-xs text-muted">{t('count', { count: filtered.length })}</p><FoodResults foods={filtered.slice(page * 30, (page + 1) * 30)} cards={cards} favorites={favorites} empty={!foods.length} onSelect={setSelected} onAdd={food => setAdd({ food, grams: 100 })} onFavorite={id => void favorite(id)} /></>}
    <div className="flex gap-inline">{page > 0 && <Button variant="secondary" onClick={() => setPage(0)}>{bt('first')}</Button>}{(page + 1) * 30 < filtered.length && <Button variant="secondary" onClick={() => setPage(value => value + 1)}>{bt('next')}</Button>}{(query || region !== 'all' || nutrition.length > 0) && <Button variant="secondary" onClick={() => { setQuery(''); setRegion('all'); setNutrition([]); setPage(0); }}>{t('clear')}</Button>}</div>
    <LibraryStats foods={foods} onSelect={setSelected} />
    {selected !== undefined && <FoodDrawer food={selected} onClose={() => setSelected(undefined)} onSaved={() => { setSelected(undefined); void resource.retry(); }}
      onMutation={(_, commit) => resource.mutate(current => ({ foods: (current?.foods ?? []).filter(food => food.id !== selected?.id), favorites: current?.favorites ?? [] }), commit)}
      onAdd={(food, grams) => { setSelected(undefined); setAdd({ food, grams }); }} />}
    {recipe && <RecipeBuilder foods={foods} onClose={() => setRecipe(false)} onSaved={() => { setRecipe(false); void resource.retry(); }} />}
    {add && <AddToPlan food={add.food} initialGrams={add.grams} onClose={() => setAdd(undefined)} />}
  </section>;
}
