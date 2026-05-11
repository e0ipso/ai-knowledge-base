# Caching Strategy

Most rendering routes in this project rely on Drupal's automatic cache tag invalidation. Set `'#cache' => ['tags' => $entity->getCacheTags()]` on render arrays and let core handle the rest.

## When the default doesn't work

Personalized content — anything that varies by authenticated user — must NOT use entity-based cache tags. The default `node_list` tag and per-entity tags cause two failure modes for personalized routes:

1. Cross-user leakage: one user's content gets served from cache to another user.
2. Site-wide invalidation: a single user's content change forces invalidation of everyone's cached pages.

For personalized routes, use:

```php
$build['#cache'] = [
  'contexts' => ['user'],
  'tags' => ['user:' . $current_user->id()],
];
```

## Other notable cases

For content that includes PII, additional encryption-at-rest is required (see `docs/architecture/pii-handling.md` — not yet written; planned).

## TODO

Document the cache backend swap we did in 2025 from default DB cache to Redis. This is currently only captured in the deployment runbook.
