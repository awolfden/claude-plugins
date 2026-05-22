# Thermo-Nuclear Code Quality Review

Use this skill when performing code reviews that demand exceptional rigor around structural quality, maintainability, and elimination of complexity. This is for reviews where "good enough" is not acceptable.

## When to Use This Skill

- Before approving significant PRs (especially those touching core architecture)
- When reviewing code that will be long-lived and frequently modified
- For changes to critical systems where maintainability is paramount
- When you need to push back on implementations that "work" but leave the codebase worse
- As a final quality gate before merging substantial features

## Core Philosophy

Be **ambitious about code structure** rather than settling for minor cleanups. Focus on identifying "code judo" moves—restructurings that preserve behavior while making implementations dramatically simpler and more elegant.

The goal is not to nitpick style, but to prevent structural decay. A working implementation that increases complexity or adds technical debt should not pass review without a compelling justification.

## Review Standards

### 1. File Size Boundary (Non-Negotiable)

**Rule**: Do not let a PR push a file from under 1,000 lines to over 1,000 lines without a very strong reason.

- Crossing the 1k threshold is a code-quality smell warranting decomposition
- If a file is growing to 1k+ lines, it likely needs to be split into multiple focused modules
- Exceptions require explicit justification and architectural reasoning

### 2. Spaghetti Prevention (Blocking)

**Rule**: Prohibit random ad-hoc conditionals scattered into unrelated flows.

- Don't allow special-case logic to be tangled into existing code paths
- Move conditional logic behind dedicated abstractions
- Avoid "if this specific case, do this weird thing" patterns unless absolutely unavoidable
- Each function/module should have a clear, focused purpose

### 3. Design Over Working Code (Required)

**Rule**: Demand cleaning the design itself, not merely accepting functional implementations.

- Working code that makes the codebase messier is not acceptable
- Review must consider: "Is this the simplest way to achieve this behavior?"
- Push for refactoring that reduces conceptual complexity
- Sometimes the right answer is "let's redesign this approach"

### 4. Type Clarity (Enforced)

**Rule**: Push back on unnecessary optionality, `any` types, and type assertions.

- Question every `| null` or `| undefined` - is this truly optional or just lazy typing?
- No `any` types without exceptional justification
- No type assertions (`as Type`) when proper type narrowing or generics would work
- Union types should be discriminated unions with clear type guards
- Type signatures should make invalid states unrepresentable

### 5. Complexity Reduction (Primary Goal)

**Rule**: Actively identify opportunities where fewer concepts, branches, or layers become necessary through restructuring.

Look for:
- Duplicate logic that should be abstracted (but not over-abstracted)
- Complex conditionals that could be replaced with data structures or polymorphism
- Nested callbacks/promises that could be flattened
- Boolean flags that represent state machines in disguise
- Helper layers that obscure rather than clarify

### 6. Approval Conditions

Code must meet ALL of these bars:

✅ **No structural regression** - The codebase should be easier to understand after this change, not harder

✅ **No missed simplifications** - There should be no obvious way to achieve the same behavior with less complexity

✅ **No unjustified file-size expansion** - Large files should not grow larger without decomposition

✅ **No spaghetti growth** - Special-case branching should not be scattered through unrelated code

✅ **Clear type boundaries** - Types should make the code's intent obvious, not obscure it

### 7. Presumptive Blockers

These patterns should block approval unless there's a compelling reason:

🚫 **Preserving incidental complexity** when cleaner solutions exist

🚫 **Adding unnecessary wrappers** that obscure actual design

🚫 **Introducing new abstractions** that aren't reused or don't simplify

🚫 **Copy-pasting logic** instead of extracting shared functionality

🚫 **Working around type errors** with assertions instead of fixing the types

🚫 **Magic numbers or strings** that should be named constants or enums

🚫 **Side effects** hidden in seemingly pure functions

## Review Process

1. **Read the entire change** - Don't review line-by-line, understand the full diff first

2. **Understand the intent** - What behavior is being added or changed? Why?

3. **Challenge the approach** - Is there a simpler way to achieve this? Could we do this with less code?

4. **Check for regression** - Is the codebase harder to understand after this change?

5. **Look for opportunities** - Where could this change enable further simplification?

6. **Articulate blockers clearly** - If blocking, explain exactly what needs to change and why

7. **Suggest alternatives** - Don't just say "this is too complex", show a simpler approach

## Example Review Comments

### Good Review Comments

> "This adds 200 lines to handle edge case X, but that edge case seems like it should be its own function. Can we extract this into `handleEdgeCaseX()` and keep the main flow simple?"

> "These three boolean flags (`isActive`, `isPending`, `isComplete`) represent a state machine. Could we replace them with a single `status` enum?"

> "This file just crossed 1,000 lines. Can we split out the validation logic into `user-validation.ts` and the persistence logic into `user-repository.ts`?"

> "We're using `| null` here but the caller never actually passes null. Can we make this non-optional and remove the null checks?"

### Avoid These Comments

❌ "This looks good but could use more comments" - Focus on making code self-explanatory, not explaining bad code

❌ "Consider adding error handling here" - If it's needed, require it, don't suggest it

❌ "Minor nit: rename this variable" - Don't waste review time on trivial naming unless it genuinely obscures meaning

❌ "LGTM" - Never approve without actually reviewing for structural quality

## Output Format

When using this skill, provide:

1. **Overall Assessment**: Does this change meet the bar? Yes/No and why

2. **Structural Concerns**: List any architectural or complexity issues (highest priority)

3. **Type Safety Issues**: List any type-related problems

4. **File Size Check**: Call out any files approaching or crossing 1k lines

5. **Recommendation**: Approve, Request Changes, or Reject (with clear reasoning)

6. **Suggested Refactorings**: If blocking, provide concrete alternatives

## Remember

- The goal is a codebase that gets **simpler over time**, not more complex
- Working code that increases technical debt is not acceptable
- It's better to take an extra day to get the structure right than to merge something that will haunt the team for years
- Your job is to prevent complexity from accumulating, not to be "nice" about code quality
- When in doubt, ask: "Will the next person who touches this code thank me or curse me?"
