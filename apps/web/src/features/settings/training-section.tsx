import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useStorage } from '@/data/storage';
import { getNewPerDay, setNewPerDay } from '@/data/training-settings';

export function TrainingSection() {
  const storage = useStorage((state) => state.storage?.storage);
  const [value, setValue] = useState('');

  useEffect(() => {
    if (!storage) return;
    let cancelled = false;
    void getNewPerDay(storage).then((n) => !cancelled && setValue(String(n)));
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
      <CardContent className="grid max-w-xs gap-2">
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
      </CardContent>
    </Card>
  );
}
