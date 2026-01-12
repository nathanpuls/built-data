-- Add sort_order to rows safely
alter table built_flexdata.rows add column if not exists sort_order double precision default 0;

-- Create an index for performance safely
create index if not exists idx_rows_sort_order on built_flexdata.rows(collection_id, sort_order);
