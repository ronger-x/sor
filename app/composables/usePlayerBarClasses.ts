import { computed } from 'vue'

export function usePlayerBarClasses() {
  const containerClasses = computed(() => [
    'fixed',
    'bottom-0',
    'left-0',
    'right-0',
    'w-full',
    'z-50',
    'shadow',
    'px-4',
    'py-3',
    'backdrop-blur'
  ])

  const centerControlClasses = computed(() => [
    'absolute',
    'left-1/2',
    'top-1/2',
    '-translate-x-1/2',
    '-translate-y-1/2',
    'md:flex',
    'items-center',
    'gap-2',
    'px-2',
    'rounded'
  ])

  const progressContainerClasses = computed(() => [
    'mx-auto',
    'md:max-w-[400px]',
    'lg:max-w-[450px]',
    'max-w-full'
  ])

  return { containerClasses, centerControlClasses, progressContainerClasses }
}
