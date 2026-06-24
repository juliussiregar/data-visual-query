#!/bin/bash
set -euo pipefail

READER_PASSWORD="${POSTGRES_READER_PASSWORD:-sheetvision_reader}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  DO \$\$
  BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'sheetvision_reader') THEN
      CREATE ROLE sheetvision_reader LOGIN PASSWORD '${READER_PASSWORD}';
    END IF;
  END
  \$\$;

  GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO sheetvision_reader;
  GRANT USAGE ON SCHEMA public TO sheetvision_reader;
  GRANT SELECT ON ALL TABLES IN SCHEMA public TO sheetvision_reader;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO sheetvision_reader;
EOSQL
