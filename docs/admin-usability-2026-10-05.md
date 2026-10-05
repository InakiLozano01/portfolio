# Admin contrast and navigation

The admin previously rendered default action buttons with black text on burgundy,
used white text on coral below the required contrast, and left several controls
without accessible names. Its theme setup also overwrote the public site's saved
theme. Admin-specific semantic colors now reach both the page and portaled menus,
dialogs and toasts, without changing that preference. Focus, disabled controls,
password visibility and keyboard technology selection have explicit states.

Section changes render immediately. Summary lists share a 30-second in-memory
cache; successful writes and leaving the admin invalidate it. Failed responses
and full editor documents are never cached. Comment counts refresh on moderation
changes and once per minute rather than on every navigation. Homepage section
editors load when opened, and project identifiers use BSON without loading the
Mongoose browser implementation.

Validation uses an isolated production build and a restored PostgreSQL database.
All ten sections were checked at desktop and mobile widths, together with project,
blog, skill, section and account-menu forms. Browser checks also cover login,
hover/focus, retained theme preference and keyboard technology selection. The
application has 59 passing tests; the PostgreSQL suite has 7 passing tests. Lint
has no errors and retains 9 existing warnings outside this change.

Across six project/blog switches, summary requests decreased from 7 to 2, and
comment-count requests from 9 to 1. Decoded JavaScript across that flow and the
sections list decreased from 1,734,974 to 1,181,984 bytes. Timing depends on the
browser, network and server load; request and byte counts are the stable comparison.

Private environments, verification sessions, database backups and deployment
manifests remain outside Git. The application receives its OpenRouter key only at
runtime. The production switch preserves the PostgreSQL/Redis deployment and
existing invoice export font configuration.
