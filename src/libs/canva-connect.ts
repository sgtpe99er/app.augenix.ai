/**
 * Canva Connect REST API client.
 *
 * Handles asset upload and design creation for the logo "Edit in Canva" flow.
 *
 * Required env var:
 *   CANVA_API_TOKEN — Personal access token or OAuth bearer token from Canva Connect.
 *                     Obtain at: https://www.canva.com/developers/apps
 *
 * API reference: https://www.canva.com/developers/docs/rest-api/
 */

const CANVA_API_BASE = 'https://api.canva.com/rest/v1'

export interface CanvaAssetUploadResult {
  assetId: string
}

export interface CanvaDesignResult {
  designId: string
  editUrl: string
  viewUrl?: string
}

/**
 * Upload an image (binary) to Canva as an asset.
 * Returns the Canva asset ID once the upload job completes.
 */
export async function uploadAssetToCanva(
  imageBuffer: ArrayBuffer,
  contentType: string,
  assetName: string,
  canvaToken: string
): Promise<CanvaAssetUploadResult> {
  const blob = new Blob([imageBuffer], { type: contentType })
  const formData = new FormData()
  formData.append('asset_upload_metadata', JSON.stringify({ name_base64: btoa(assetName) }))
  formData.append('file', blob, assetName)

  const uploadResponse = await fetch(`${CANVA_API_BASE}/assets/uploads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${canvaToken}` },
    body: formData,
  })

  if (!uploadResponse.ok) {
    const err = await uploadResponse.text()
    throw new Error(`Canva asset upload failed (${uploadResponse.status}): ${err}`)
  }

  const uploadData = await uploadResponse.json()
  const jobId: string = uploadData?.job?.id ?? uploadData?.asset?.id

  if (!jobId) {
    throw new Error('Canva upload response missing job/asset ID')
  }

  // If it's a synchronous response with asset already available
  if (uploadData?.asset?.id) {
    return { assetId: uploadData.asset.id }
  }

  // Poll for async job completion (up to 30s)
  for (let i = 0; i < 15; i++) {
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const jobResponse = await fetch(`${CANVA_API_BASE}/assets/uploads/${jobId}`, {
      headers: { Authorization: `Bearer ${canvaToken}` },
    })

    if (!jobResponse.ok) continue

    const jobData = await jobResponse.json()
    const status = jobData?.job?.status ?? jobData?.status

    if (status === 'success' || status === 'complete') {
      const assetId = jobData?.job?.asset?.id ?? jobData?.asset?.id
      if (assetId) return { assetId }
    }

    if (status === 'failed' || status === 'error') {
      throw new Error(`Canva upload job failed: ${JSON.stringify(jobData)}`)
    }
  }

  throw new Error('Canva asset upload timed out after 30s')
}

/**
 * Create an editable Canva design of logo dimensions.
 * Returns the design ID and edit URL.
 */
export async function createCanvaDesign(
  assetId: string,
  designTitle: string,
  canvaToken: string
): Promise<CanvaDesignResult> {
  // Create a logo-sized design (500x500 is standard Canva logo preset)
  const response = await fetch(`${CANVA_API_BASE}/designs`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${canvaToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: designTitle,
      design_type: {
        type: 'preset',
        name: 'Logo',
      },
      asset_id: assetId,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Canva design creation failed (${response.status}): ${err}`)
  }

  const data = await response.json()
  const design = data?.design ?? data

  const designId: string = design?.id
  const editUrl: string = design?.urls?.edit_url ?? `https://www.canva.com/design/${designId}/edit`
  const viewUrl: string | undefined = design?.urls?.view_url

  if (!designId) {
    throw new Error(`Canva design creation response missing ID: ${JSON.stringify(data)}`)
  }

  return { designId, editUrl, viewUrl }
}

/**
 * Full pipeline: upload image to Canva and create an editable design.
 * Returns { assetId, designId, editUrl }.
 */
export async function uploadToCanvaAndCreateDesign(
  imageBuffer: ArrayBuffer,
  contentType: string,
  assetName: string,
  designTitle: string,
  canvaToken: string
): Promise<{ assetId: string; designId: string; editUrl: string }> {
  const { assetId } = await uploadAssetToCanva(imageBuffer, contentType, assetName, canvaToken)
  const { designId, editUrl } = await createCanvaDesign(assetId, designTitle, canvaToken)
  return { assetId, designId, editUrl }
}
