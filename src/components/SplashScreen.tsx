import { motion } from "framer-motion";

export function SplashScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0" style={{ background: "var(--gradient-bg)" }} />
      <motion.div
        className="absolute h-[60vmin] w-[60vmin] rounded-full"
        style={{ background: "var(--gradient-primary)", filter: "blur(80px)", opacity: 0.55 }}
        animate={{ scale: [1, 1.15, 1], rotate: [0, 90, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center gap-4"
      >
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          className="flex h-24 w-24 items-center justify-center rounded-3xl gradient-primary glow text-5xl"
        >
          🍇
        </motion.div>
        <h1 className="text-4xl font-extrabold tracking-tight text-white">
          Cantinho do <span className="text-gradient">Açaí</span>
        </h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-sm text-white/60"
        >
          Gestão premium para o seu negócio
        </motion.p>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: 180 }}
          transition={{ delay: 0.4, duration: 1.6, ease: "easeInOut" }}
          className="mt-4 h-1 rounded-full gradient-primary"
        />
      </motion.div>
    </div>
  );
}
