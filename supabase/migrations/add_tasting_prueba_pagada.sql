alter table public.tastings
  add column if not exists prueba_pagada boolean default false;

-- Mantener datos existentes alineados con costo_pagado
update public.tastings
set prueba_pagada = coalesce(costo_pagado, false)
where prueba_pagada is distinct from coalesce(costo_pagado, false);
