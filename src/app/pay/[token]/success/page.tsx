import Link from 'next/link';
import { IoCheckmarkCircle, IoGlobe } from 'react-icons/io5';

export default function PaymentSuccessPage() {
  return (
    <div className='flex min-h-screen flex-col items-center justify-center bg-black px-4 py-16'>
      <div className='mb-10 flex items-center gap-3'>
        <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500'>
          <IoGlobe className='h-6 w-6 text-black' />
        </div>
        <span className='text-xl font-bold tracking-tight'>FreeWebsite</span>
      </div>

      <div className='w-full max-w-md text-center'>
        <IoCheckmarkCircle className='mx-auto mb-4 h-16 w-16 text-emerald-400' />
        <h1 className='mb-2 text-2xl font-bold'>Payment Successful!</h1>
        <p className='mb-8 text-neutral-400'>
          Thank you for your payment. We&apos;re now generating your custom logo, branding, and
          website. You&apos;ll receive an email when everything is ready.
        </p>
        <Link
          href='/dashboard'
          className='inline-flex items-center justify-center rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-black hover:bg-emerald-400'
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
