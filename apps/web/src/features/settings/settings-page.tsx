import { Page } from '@/components/page';
import { ArrowLeft } from 'lucide-react';
import { BoardSettingsForm } from '@/components/board/board-settings';
import { DataSection } from './data-section';
import { ExplorerSection } from './explorer-section';
import { TrainingSection } from './training-section';
import { useTheme, type Theme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { to } from '@/router/location';

const THEMES: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'Match my device' },
];

// Grading mode, cards per day, board theme, the explorer token, and export/import arrive with the phases that need them.
export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  return (
    <Page>
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <a href={to('/')}>
          <ArrowLeft aria-hidden /> Back
        </a>
      </Button>
      <h2 className="text-2xl font-semibold">Settings</h2>
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Saved on this device.</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={theme} onValueChange={(value) => setTheme(value as Theme)}>
            {THEMES.map(({ value, label }) => (
              <div key={value} className="flex items-center gap-2">
                <RadioGroupItem value={value} id={`theme-${value}`} />
                <Label htmlFor={`theme-${value}`}>{label}</Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Board</CardTitle>
          <CardDescription>Colours, pieces and the aids on the board. Changes show at once.</CardDescription>
        </CardHeader>
        <CardContent>
          <BoardSettingsForm />
        </CardContent>
      </Card>
      <TrainingSection />
      <ExplorerSection />
      <Card>
        <CardHeader>
          <CardTitle>Board lab</CardTitle>
          <CardDescription>Paste a PGN or FEN to see a position. Handy when writing a course.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <a href={to('/lab')}>Open the board lab</a>
          </Button>
        </CardContent>
      </Card>
      <DataSection />
    </Page>
  );
}
