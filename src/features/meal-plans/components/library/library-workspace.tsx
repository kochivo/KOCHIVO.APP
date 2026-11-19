'use client';
import { useCallback, useId, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useT } from '@/core/i18n/client';
import { useResource } from '@/core/resource';
import { Button } from '@/ui/button';
import { Chip } from '@/ui/chip';
import { IconButton } from '@/ui/icon-button';
import { LoadingState } from '@/ui/loading-state';
import { Segmented } from '@/ui/segmented';
import { Box, FileText, ListFilter, Search } from 'lucide-react';
import { PageBarTitle } from '@/ui/page-bar-title';
import { PageBarActions } from '@/ui/page-bar-actions';
import { PageBarMenu } from '@/ui/page-bar-menu';
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
import { RecentFoods } from './recent-foods';
import { LibraryLoading } from './library-loading';
const FoodDrawer = dynamic(() => import('./food-drawer').then(module => module.FoodDrawer), { loading: () => <LoadingState variant="detail" /> });
const RecipeBuilder = dynamic(() => import('./recipe-builder').then(module => module.RecipeBuilder), { loading: () => <LoadingState variant="detail" /> });
const AddToPlan = dynamic(() => import('./add-to-plan').then(module => module.AddToPlan), { loading: () => <LoadingState variant="detail" /> });

export function LibraryWorkspace() {
  const t = useT(messages), bt = useT(baseMessages), toast = useToast();
  const [query, setQuery] = useState(''), [region, setRegion] = useState<RegionFilter>('all');
  const [nutrition, setNutrition] = useState<NutritionFilter[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const filtersId = useId();
  const [cards, setCards] = useState(false), [page, setPage] = useState(0);
  const [selected, setSelected] = useState<LibraryFood | null | undefined>();
  const [recipe, setRecipe] = useState(false), [add, setAdd] = useState<{ food: Food; grams: number }>();
  const pending = useRef(new Set<string>());
  const load = useCallback(() => loadFoodLibrary(), []);
  const resource = useResource(foodResourceKey('foods-library-v2'), load);
  const loading = !resource.data && (resource.status === 'loading' || resource.status === 'idle');
  const foods = resource.data?.foods ?? [];
  const favorites = useMemo(() => new Set(resource.data?.favorites ?? []), [resource.data?.favorites]);
  const filtered = filterFoods(foods, query, region, nutrition, favorites) as LibraryFood[];
  const regional = region === 'all' || region === 'mine' || region === 'favorites' ? 'eg' : region;
  const counts = useMemo(() => {
    if (!resource.data) return;
    const catalog = resource.data.foods;
    return new Map((['all', regional, 'mine', 'favorites'] as const).map(key =>
      [key, key === 'all' ? catalog.length : filterFoods(catalog, '', key, [], favorites).length]));
  }, [resource.data, regional, favorites]);
  const changeRegion = (key: RegionFilter) => { setRegion(key); setPage(0); };
  const option = (value: RegionFilter) => {
    const count = counts?.get(value);
    const label = t(value);
    return { value, label: count === undefined ? label : t('tabCount', { label, count }) };
  };
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
    <PageBarTitle title={t('title')} subtitle={loading ? t('loading') : resource.data ? t('count', { n: foods.length, count: foods.length }) : t('subtitle')} />
    <PageBarActions>
      <Button variant="secondary" className="max-md:hidden!" onClick={() => setRecipe(true)}>{t('recipeNew')}</Button>
      <Button id="new-library-food" aria-label={bt('new')} className="max-md:min-w-12 max-md:px-inline!" onClick={() => setSelected(null)}>
        <KoPlus aria-hidden className="size-5 max-md:text-on-lime!" /><span className="max-md:sr-only">{bt('new')}</span>
      </Button>
      <PageBarMenu><Button variant="ghost" onClick={() => setRecipe(true)}>{t('recipeNew')}</Button></PageBarMenu>
    </PageBarActions>
    <div className="flex min-w-0 flex-wrap items-center gap-stack">
      <label className="flex min-h-12 w-full min-w-0 items-center gap-inline rounded-control border border-line-soft bg-bg-deep px-stack min-[760px]:w-1/3">
        <span className="sr-only">{bt('search')}</span><Search aria-hidden className="size-4 shrink-0 text-muted" />
        <input type="search" className="min-h-12 min-w-0 flex-1 bg-transparent text-sm" maxLength={100} placeholder={bt('search')} value={query} onChange={event => { setQuery(event.target.value); setPage(0); }} />
      </label>
      <Segmented aria-label={t('type')} value={region} className="min-w-0 max-w-full overflow-x-auto [&>button]:shrink-0 [&>button]:basis-auto [&>button]:whitespace-nowrap [&>button]:text-row" options={[
        option('all'), option(regional), option('mine'), option('favorites'),
      ]} onChange={value => { const next = regions.find(key => key === value); if (next) changeRegion(next); }} />
      <div className="ms-auto flex items-center gap-inline">
        <Button variant="secondary" aria-expanded={showFilters} aria-controls={filtersId} onClick={() => setShowFilters(value => !value)}>
          <ListFilter aria-hidden className="size-4" />{t('filters')}
        </Button>
        <div className="glass flex rounded-control">
          <IconButton aria-label={t('table')} aria-pressed={!cards} onClick={() => setCards(false)} className="aria-pressed:bg-surface-raised!"><FileText aria-hidden className="size-4" /></IconButton>
          <IconButton aria-label={t('cards')} aria-pressed={cards} onClick={() => setCards(true)} className="aria-pressed:bg-surface-raised!"><Box aria-hidden className="size-4" /></IconButton>
        </div>
      </div>
    </div>
    <div id={filtersId} hidden={!showFilters}>
      {showFilters && <div className="glass grid gap-stack rounded-card p-card text-sm text-muted">
        <div className="flex flex-wrap items-center gap-inline"><span className="text-xs text-muted">{t('examples')}</span>{(['chicken', 'bread', 'meat'] as const).map(key => <Chip key={key} pressed={query === t(key)} onClick={() => { setQuery(t(key)); setPage(0); }}>{t(key)}</Chip>)}</div>
        <div className="flex flex-wrap gap-inline">{regions.filter(key => key !== 'all' && key !== 'mine' && key !== 'favorites').map(key =>
          <Chip key={key} pressed={region === key} onClick={() => changeRegion(key)}>{t(key)}</Chip>)}</div>
        <div className="flex flex-wrap gap-inline">{nutrients.map(key => <Chip key={key} pressed={nutrition.includes(key)} onClick={() => { setNutrition(value => value.includes(key) ? value.filter(item => item !== key) : [...value, key]); setPage(0); }}>{t(key)}</Chip>)}</div>
        {resource.data && <RecentFoods foods={foods} onSelect={setSelected} />}
      </div>}
    </div>
    {loading && <LibraryLoading />}
    {Boolean(resource.error) && <div role="alert"><p>{bt('error')}</p><Button variant="secondary" onClick={() => void resource.retry()}>{bt('retry')}</Button></div>}
    {resource.data && <FoodResults foods={filtered.slice(page * 30, (page + 1) * 30)} cards={cards} favorites={favorites} empty={!foods.length} onSelect={setSelected} onAdd={food => setAdd({ food, grams: 100 })} onFavorite={id => void favorite(id)} />}
    <div className="flex gap-inline">{page > 0 && <Button variant="secondary" onClick={() => setPage(0)}>{bt('first')}</Button>}{(page + 1) * 30 < filtered.length && <Button variant="secondary" onClick={() => setPage(value => value + 1)}>{bt('next')}</Button>}{(query || region !== 'all' || nutrition.length > 0) && <Button variant="secondary" onClick={() => { setQuery(''); setRegion('all'); setNutrition([]); setPage(0); }}>{t('clear')}</Button>}</div>
    {selected !== undefined && <FoodDrawer food={selected} onClose={() => setSelected(undefined)} onSaved={() => { setSelected(undefined); void resource.retry(); }}
      onMutation={(_, commit) => resource.mutate(current => ({ foods: (current?.foods ?? []).filter(food => food.id !== selected?.id), favorites: current?.favorites ?? [] }), commit)}
      onAdd={(food, grams) => { setSelected(undefined); setAdd({ food, grams }); }} />}
    {recipe && <RecipeBuilder foods={foods} onClose={() => setRecipe(false)} onSaved={() => { setRecipe(false); void resource.retry(); }} />}
    {add && <AddToPlan food={add.food} initialGrams={add.grams} onClose={() => setAdd(undefined)} />}
  </section>;
}
