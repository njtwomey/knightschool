import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useStorage } from '@/data/storage';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  getIncludeRare,
  getMinPopularityPercent,
  getNewPerDay,
  setIncludeRare,
  setMinPopularityPercent,
  setNewPerDay,
} from '@/data/training-settings';

/** Choices for the share of games a sideline must reach to earn cards. 0 turns the cut off. */
const POPULARITY_CHOICES = [0, 1, 2, 5, 10, 20];

export function TrainingSection() {
  const storage = useStorage((state) => state.storage?.storage);
  const [value, setValue] = useState('');
  const [rare, setRare] = useState(false);
  const [popularity, setPopularity] = useState('5');

  useEffect(() => {
    if (!storage) return;
    let cancelled = false;
    void getNewPerDay(storage).then((n) => !cancelled && setValue(String(n)));
    void getIncludeRare(storage).then((on) => !cancelled && setRare(on));
    void getMinPopularityPercent(storage).then((n) => !cancelled && setPopularity(String(n)));
    return () => {
      cancelled = true;
    };
  }, [storage]);

  async function save() {
    const n = Number(value);
    if (!storage || !Number.isInteger(n) || n < 0 || n > 100) return;
    await setNewPerDay(storage, n, new Date());
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Training</CardTitle>
        <CardDescription>How fast new moves arrive. A small number keeps the daily quiz short.</CardDescription>
      </CardHeader>
      <CardContent className="grid max-w-md gap-4">
        <div className="grid max-w-xs gap-2">
          <Label htmlFor="new-per-day">New cards per day</Label>
          <Input
            id="new-per-day"
            type="number"
            min={0}
            max={100}
            value={value}
            disabled={!storage}
            onChange={(event) => setValue(event.target.value)}
            onBlur={() => void save()}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="include-rare" className="grid gap-0.5 font-normal">
            <span className="font-medium">Include rare lines</span>
            <span className="text-xs text-muted-foreground">
              Lines the courses mark as rare get quiz cards too. Off, you still see them but are not quizzed on them.
            </span>
          </Label>
          <Switch
            id="include-rare"
            checked={rare}
            disabled={!storage}
            onCheckedChange={(on) => {
              setRare(on);
              if (storage) void setIncludeRare(storage, on, new Date());
            }}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="min-popularity" className="grid gap-0.5 font-normal">
            <span className="font-medium">Skip sidelines few players reach</span>
            <span className="text-xs text-muted-foreground">
              A sideline position that fewer than this share of games reach gets no card. Main lines and gambits always
              do. Needs the popularity data, so it does nothing for positions not fetched yet.
            </span>
          </Label>
          <Select
            value={popularity}
            disabled={!storage}
            onValueChange={(value) => {
              setPopularity(value);
              if (storage) void setMinPopularityPercent(storage, Number(value), new Date());
            }}
          >
            <SelectTrigger id="min-popularity" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POPULARITY_CHOICES.map((percent) => (
                <SelectItem key={percent} value={String(percent)}>
                  {percent === 0 ? 'Off' : `${percent}%`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
