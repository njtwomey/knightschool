# Pager

Previous and next through a sequence, so a learner can go in order without going back or opening a menu.

## Shows

- Up to two small outline buttons, "Previous: Set-up" and "Next: Bishop to c4", each with an arrow. The name is cut off
  when long and shown in full on hover.
- The end of a sequence has no button on that side.

## Configuration

- `previous`, `next`: where each goes, as a name and an address, with `onOpen` when it has to ask first.
- `label`: what the sequence is, for screen readers.

## Used by

Beside the stages on [step](../pages/step.md), [follow-up](../pages/follow-up.md) and [line](../pages/line.md):

- **Steps** go from step to step across the opening's variations, past the follow-ups, so the main line stays unbroken.
- **Follow-ups** run from their step: the first goes back to it and the last goes on to the step after.
- **Lines** go through the opening's lines in the order of the breadcrumb's menu.

A locked step or follow-up asks once per opening before opening, as the [breadcrumbs](breadcrumbs.md) do.
