# Portfolio draft integration

The deployed baseline was `85d2dc6`: PostgreSQL, the faster admin lists, Jev
moderation, invoice history and private signature exports. The VPS and origin
already had only `main`; two historical stashes remained in a recovery bundle.

| Draft | Integration into the current implementation |
| --- | --- |
| `ea6c57a296fbb6b78e69dcd51a7e80356eedd2bd` | Adopt the public scroll layout, sticky navigation, cream/navy/bordeaux tokens, Geist typography, lighter cards, hero actions, newsletter styling and responsive footer. Preserve current server-provided data, localized dictionaries, legal identity, metadata and keyboard controls. |
| `234eafbd7069407aa8d718740fb06c30935e566c` | Preserve its goal of adequate mobile space and unobstructed navigation through the new document layout. Fixed carousel/header/footer height calculations are superseded by natural section and footer heights, viewport-sized hero, safe-area padding and a scrollable mobile menu. |

The integration adapts useful changes to the current baseline. It retains the
current language/SEO layouts and error boundaries instead of restoring the
draft's nested HTML document, obsolete root page or deleted template. Geist
comes from the installed Next font loader, without adding the missing `geist`
package. The two conflicting Tailwind configurations become one TypeScript
configuration, including the admin action-color override and typography plugin.
Generated `tsconfig.tsbuildinfo` and unused visual noise are excluded.

All current section data contracts remain in place. Public navigation preserves
the locale, supports deep links and browser history, respects reduced motion and
keeps the mobile menu's focus trap and Escape behavior. The footer's localized
legal link and full legal name remain visible. The invoice signature stays in
the private read-only runtime mount; no secret or personal image enters Git.

The historical stashes are reviewed parents of the validated integration commit.
Their redundant recovery bundle can then be deleted
because both complete drafts are reachable from the sole `main` branch.

Validation used a capped Docker build and a separate PostgreSQL instance restored
from the verified backup. All 19 Jest suites (61 tests), 14 invoice renderer/store
checks and the production build with TypeScript passed. Browser verification
covered Spanish/English deep links, history navigation, tablet/mobile menu focus,
overflow, signed invoice export and immutable previous PDF bytes. Axe reported
zero WCAG A/AA violations on the public page and invoice admin. The check also
identified unnamed project technology SVGs; these now expose their skill names.
ESLint finished with no errors and the same nine pre-existing warnings.
Additional browser checks passed for a project detail, blog article and legal
page on mobile, and the projects, blogs and comments admin sections. The isolated
admin summary responses were 25,642 and 2,595 characters respectively, retaining
the existing optimized list endpoints.
