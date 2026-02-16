# Radix Accent Color Map

Each entry shows the Radix color name and its step-9 hex value (the primary/solid shade used for buttons, active states, and accent backgrounds). These values are sourced directly from `@radix-ui/themes/tokens.css`.

When matching a brand color, find the entry with the smallest RGB Euclidean distance.

## Color Table

| Radix Color | Hex (Step 9) | Hue Family     |
|-------------|-------------|----------------|
| tomato      | #E54D2E     | Red-Orange     |
| red         | #E5484D     | Red            |
| ruby        | #E54666     | Red-Pink       |
| crimson     | #E93D82     | Pink-Red       |
| pink        | #D6409F     | Pink           |
| plum        | #AB4ABA     | Purple-Pink    |
| purple      | #8E4EC6     | Purple         |
| violet      | #6E56CF     | Blue-Purple    |
| iris        | #5B5BD6     | Indigo         |
| indigo      | #3E63DD     | Blue-Indigo    |
| blue        | #0090FF     | Blue           |
| cyan        | #00A2C7     | Cyan           |
| teal        | #12A594     | Teal           |
| jade        | #29A383     | Green-Teal     |
| green       | #30A46C     | Green          |
| grass       | #46A758     | Green          |
| lime        | #BDEE63     | Yellow-Green   |
| yellow      | #FFE629     | Yellow         |
| amber       | #FFC53D     | Yellow-Orange  |
| orange      | #F76B15     | Orange         |
| bronze      | #A18072     | Brown-Warm     |
| gold        | #978365     | Brown-Gold     |
| brown       | #AD7F58     | Brown          |
| sky         | #7CE2FE     | Light Blue     |
| mint        | #86EAD4     | Light Teal     |

## Color Distance Algorithm

To find the closest Radix color to a brand hex color, compute the Euclidean distance in RGB space:

```
distance = sqrt((r1-r2)^2 + (g1-g2)^2 + (b1-b2)^2)
```

1. Convert both hex colors to RGB (e.g., #E54D2E → R:229, G:77, B:46)
2. Compute distance for each Radix color
3. Pick the one with the smallest distance

If two colors are nearly equidistant, prefer the one whose hue family matches the brand's visual identity (e.g., a warm brand should lean toward warm hues).
