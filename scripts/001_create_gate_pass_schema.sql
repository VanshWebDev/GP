-- Create profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null check (role in ('student', 'teacher')),
  full_name text,
  created_at timestamp default now()
);

-- Create gate pass requests table
create table if not exists public.gate_pass_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  destination text not null,
  reason text not null,
  departure_time timestamp not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  teacher_id uuid references auth.users(id),
  teacher_notes text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.gate_pass_requests enable row level security;

-- Profiles RLS Policies
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- Gate pass requests RLS Policies
create policy "students_view_own_requests"
  on public.gate_pass_requests for select
  using (auth.uid() = student_id);

create policy "students_create_requests"
  on public.gate_pass_requests for insert
  with check (auth.uid() = student_id);

create policy "teachers_view_all_requests"
  on public.gate_pass_requests for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'teacher'
    )
  );

create policy "teachers_update_requests"
  on public.gate_pass_requests for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'teacher'
    )
  );

-- Create trigger for auto-creating profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'role', 'student'),
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
