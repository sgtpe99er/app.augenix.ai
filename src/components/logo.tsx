import Image from 'next/image';
import Link from 'next/link';

export function Logo() {
  return (
    <Link href='/' className='flex w-fit items-center gap-2'>
      <Image src='/FWD_logo.webp' alt='FWD' width={64} height={64} />
      <span className='font-logo text-3xl italic'>
        <span className='text-black dark:text-white'>FreeWebsite.</span>
        <span className='text-emerald-400'>Deal</span>
      </span>
    </Link>
  );
}
