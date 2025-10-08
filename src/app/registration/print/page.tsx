// Force this route to be rendered dynamically at request time instead of prerendered
export const dynamic = "force-dynamic";

import React from 'react'
import Print from '../components/print'

export default function PrintPage() {
  return (
    <div>
      {/* Print is a client component (uses window.print) */}
      <Print />
    </div>
  )
}