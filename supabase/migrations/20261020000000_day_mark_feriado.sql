-- Feriado como tipo do dia marcado à mão (docs/02 §3.1 e §9).

alter table public.day_marks drop constraint day_marks_type_check;
alter table public.day_marks add constraint day_marks_type_check
  check (type in ('falta', 'atestado', 'ferias', 'folga_compensada', 'abono', 'feriado'));
