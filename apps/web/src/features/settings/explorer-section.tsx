import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getToken, setToken } from '@/features/explorer/service';

export function ExplorerSection() {
  const [saved, setSaved] = useState(() => getToken() !== null);
  const [value, setValue] = useState('');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lichess explorer</CardTitle>
        <CardDescription>
          Shows what people at 1000 to 1600 play in each position. It needs a free personal token from Lichess: no
          scopes are needed.{' '}
          <a
            className="underline underline-offset-4"
            href="https://lichess.org/account/oauth/token"
            target="_blank"
            rel="noreferrer"
          >
            Create one
          </a>
          . It is kept only in this browser, and is not part of exports or backups.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid max-w-md gap-3">
        {saved ? (
          <div className="flex items-center gap-3">
            <p className="text-sm">A token is saved. The explorer is on.</p>
            <Button variant="outline" size="sm" onClick={() => (setToken(null), setSaved(false))}>
              Remove it
            </Button>
          </div>
        ) : (
          <form
            className="grid gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (value.trim()) {
                setToken(value.trim());
                setSaved(true);
                setValue('');
              }
            }}
          >
            <Label htmlFor="lichess-token">Token</Label>
            <div className="flex gap-2">
              <Input
                id="lichess-token"
                type="password"
                autoComplete="off"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder="lip_…"
              />
              <Button type="submit" disabled={!value.trim()}>
                Save
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
