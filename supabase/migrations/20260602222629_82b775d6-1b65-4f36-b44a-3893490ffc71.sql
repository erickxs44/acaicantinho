
-- Tables for Cantinho do Açaí

CREATE TABLE public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  telefone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.vendas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  produto TEXT NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  tipo_pagamento TEXT NOT NULL CHECK (tipo_pagamento IN ('pix','cartao','dinheiro','fiado')),
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  is_fiado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.despesas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.fiados_registros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  venda_id UUID REFERENCES public.vendas(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  valor_total NUMERIC(10,2) NOT NULL,
  valor_pago NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','pago')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ
);

-- Track partial fiado payments so they count as revenue when received
CREATE TABLE public.fiados_pagamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  fiado_id UUID NOT NULL REFERENCES public.fiados_registros(id) ON DELETE CASCADE,
  valor NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.despesas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fiados_registros TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fiados_pagamentos TO authenticated;
GRANT ALL ON public.clientes, public.vendas, public.despesas, public.fiados_registros, public.fiados_pagamentos TO service_role;

-- RLS
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiados_registros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiados_pagamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own clientes" ON public.clientes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own vendas" ON public.vendas FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own despesas" ON public.despesas FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own fiados" ON public.fiados_registros FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own fiados_pag" ON public.fiados_pagamentos FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_vendas_user_created ON public.vendas(user_id, created_at DESC);
CREATE INDEX idx_despesas_user_created ON public.despesas(user_id, created_at DESC);
CREATE INDEX idx_fiados_user_status ON public.fiados_registros(user_id, status);
CREATE INDEX idx_fiados_pag_user ON public.fiados_pagamentos(user_id, created_at DESC);
