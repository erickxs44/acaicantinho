import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ShoppingCart, ArrowDownRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function Fab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="fixed z-40 bottom-24 right-4 md:bottom-8 md:right-8 flex flex-col items-end gap-3">
        <AnimatePresence>
          {open && (
            <>
              <Link
                to="/pdg"
                onClick={() => setOpen(false)}
                className="block"
              >
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.8 }}
                  transition={{ delay: 0.05 }}
                  className="glass-strong rounded-full pl-4 pr-5 py-3 flex items-center gap-2 font-semibold text-sm shadow-xl border border-destructive/20"
                >
                  <span className="h-8 w-8 rounded-full bg-destructive/20 flex items-center justify-center">
                    <ArrowDownRight className="h-4 w-4 text-destructive" />
                  </span>
                  Nova Despesa
                </motion.div>
              </Link>
              <Link
                to="/pdv"
                onClick={() => setOpen(false)}
                className="block"
              >
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.8 }}
                  className="glass-strong rounded-full pl-4 pr-5 py-3 flex items-center gap-2 font-semibold text-sm shadow-xl border border-emerald-brand/20"
                >
                  <span className="h-8 w-8 rounded-full bg-emerald-brand/20 flex items-center justify-center">
                    <ShoppingCart className="h-4 w-4 text-emerald-brand" />
                  </span>
                  Nova Venda
                </motion.div>
              </Link>
            </>
          )}
        </AnimatePresence>
        <motion.button
          whileTap={{ scale: 0.92 }}
          whileHover={{ scale: 1.05 }}
          onClick={() => setOpen((o) => !o)}
          animate={{ rotate: open ? 135 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="h-14 w-14 rounded-full gradient-primary glow flex items-center justify-center shadow-2xl"
          aria-label="Ações rápidas"
        >
          <Plus className="h-7 w-7 text-white" />
        </motion.button>
      </div>
    </>
  );
}
