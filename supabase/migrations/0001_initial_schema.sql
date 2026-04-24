-- ============================================================
-- 0001_initial_schema.sql
-- ============================================================

-- ------------------------------------------------------------
-- companies
-- ------------------------------------------------------------
create table companies (
  id               uuid        primary key default gen_random_uuid(),
  company_name     text        not null,
  description      text,
  revenue          text,
  ebitda           text,
  owner            text,
  introduced_by    text,
  next_steps       text,

  status           text        not null default 'Inbox'
                               constraint companies_status_check check (
                                 status in (
                                   'Inbox',
                                   'Active',
                                   'Monitor - Near Term',
                                   'Monitor - Longer Term',
                                   'Archived'
                                 )
                               ),

  next_review_date date,
  last_reviewed_at timestamptz,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  archived_at      timestamptz,
  archive_reason   text
);

-- keep updated_at current automatically
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger companies_set_updated_at
  before update on companies
  for each row execute function set_updated_at();


-- ------------------------------------------------------------
-- company_notes
-- ------------------------------------------------------------
create table company_notes (
  id          uuid        primary key default gen_random_uuid(),
  company_id  uuid        not null references companies (id) on delete cascade,
  body        text        not null,
  note_type   text        not null default 'general'
                          constraint company_notes_note_type_check check (
                            note_type in ('general', 'call', 'meeting', 'email', 'other')
                          ),
  created_at  timestamptz not null default now()
);

create index company_notes_company_id_idx on company_notes (company_id);


-- ------------------------------------------------------------
-- history_events
-- ------------------------------------------------------------
create table history_events (
  id          uuid        primary key default gen_random_uuid(),
  company_id  uuid        not null references companies (id) on delete cascade,
  event_type  text        not null
                          constraint history_events_event_type_check check (
                            event_type in (
                              'created',
                              'status_changed',
                              'review_date_changed',
                              'archived',
                              'reopened'
                            )
                          ),
  old_value   text,
  new_value   text,
  created_at  timestamptz not null default now()
);

create index history_events_company_id_idx on history_events (company_id);
