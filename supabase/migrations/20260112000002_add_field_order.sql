-- Add sort_order to fields safely
alter table built_flexdata.fields add column if not exists sort_order double precision default 0;

-- Create an index for performance
create index if not exists idx_fields_sort_order on built_flexdata.fields(collection_id, sort_order);

-- Same for rows to be safe
alter table built_flexdata.rows add column if not exists sort_order double precision default 0;
create index if not exists idx_rows_sort_order on built_flexdata.rows(collection_id, sort_order);
