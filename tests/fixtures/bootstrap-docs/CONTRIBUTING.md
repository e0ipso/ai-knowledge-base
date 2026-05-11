# Contributing

## Setup

```
composer install
vendor/bin/drush si --existing-config
```

## Code style

We follow the standard Drupal coding standards (`drupal/coder`). Run the linter before committing:

```
vendor/bin/phpcs --standard=Drupal modules/custom
```

## Testing

Unit and kernel tests are required for any new service class. Run the full test suite with:

```
vendor/bin/phpunit -c web/core
```

Functional tests run in CI only; local environments don't need to run them.

## Commit messages

Use conventional commit format: `<type>(<scope>): <description>`. Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`.

## PR review

At least one approving review is required before merging to `main`. Code owners are listed in `.github/CODEOWNERS`.
