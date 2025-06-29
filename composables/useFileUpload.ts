// composables/useFileUpload.ts
export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

export interface UploadResult {
  success: boolean
  data?: any
  error?: string
}

export const useFileUpload = () => {
  const isUploading = ref(false)
  const uploadProgress = ref<UploadProgress>({ loaded: 0, total: 0, percentage: 0 })
  const error = ref<string | null>(null)

  // Upload files to server endpoint
  const uploadFiles = async (
    files: File[],
    endpoint: string,
    additionalData?: Record<string, any>,
    options?: { fileFieldName?: string; additionalDataFieldName?: string }
  ): Promise<UploadResult> => {
    if (!files || files.length === 0) {
      error.value = 'No files selected'
      return { success: false, error: error.value }
    }

    isUploading.value = true
    error.value = null
    uploadProgress.value = { loaded: 0, total: 0, percentage: 0 }

    try {
      const formData = new FormData()
      
      if (options?.additionalDataFieldName) {
        // Mode for specific endpoints that expect bundled metadata (e.g., monologue upload)
        if (additionalData) {
          formData.append(options.additionalDataFieldName, JSON.stringify(additionalData))
        }
        if (files.length > 0) {
          // This mode is best suited for single file uploads
          const fieldName = options.fileFieldName || 'file'
          formData.append(fieldName, files[0])
        }
      } else {
        // Original generic mode
        files.forEach((file, index) => {
          formData.append(`file${index}`, file)
        })
        
        if (additionalData) {
          Object.entries(additionalData).forEach(([key, value]) => {
            formData.append(key, typeof value === 'string' ? value : JSON.stringify(value))
          })
        }
      }

      const result = await $fetch<{
        success: boolean;
        data?: { uploadedFiles: string[] };
        error?: string
      }>(endpoint, {
        method: 'POST',
        body: formData
      })

      if (result.success && result.data) {
        return { success: true, data: result.data }
      } else {
        const errorMessage = result.error || 'Unknown upload error'
        error.value = errorMessage
        return { success: false, error: errorMessage }
      }
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'An error occurred during file upload'
      error.value = errorMessage
      return { success: false, error: errorMessage }
    } finally {
      isUploading.value = false
    }
  }

  // Upload single file
  const uploadFile = async (
    file: File,
    endpoint: string,
    additionalData?: Record<string, any>,
    options?: { fileFieldName?: string; additionalDataFieldName?: string }
  ): Promise<UploadResult> => {
    return uploadFiles([file], endpoint, additionalData, options)
  }

  // Upload blob (for recorded audio/video)
  const uploadBlob = async (
    blob: Blob,
    filename: string,
    endpoint: string,
    additionalData?: Record<string, any>,
    options?: { fileFieldName?: string; additionalDataFieldName?: string }
  ): Promise<UploadResult> => {
    const file = new File([blob], filename, { type: blob.type })
    return uploadFile(file, endpoint, additionalData, options)
  }

  // Validate file type
  const validateFileType = (file: File, allowedTypes: string[]): boolean => {
    return allowedTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.slice(0, -1))
      }
      return file.type === type
    })
  }

  // Validate file size
  const validateFileSize = (file: File, maxSizeInMB: number): boolean => {
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024
    return file.size <= maxSizeInBytes
  }

  // Validate multiple files
  const validateFiles = (
    files: File[],
    options: {
      allowedTypes?: string[]
      maxSizeInMB?: number
      maxFiles?: number
    } = {}
  ): { valid: boolean; errors: string[] } => {
    const errors: string[] = []
    
    // Check number of files
    if (options.maxFiles && files.length > options.maxFiles) {
      errors.push(`Maximum ${options.maxFiles} files allowed`)
    }
    
    // Check each file
    files.forEach((file, index) => {
      // Check file type
      if (options.allowedTypes && !validateFileType(file, options.allowedTypes)) {
        errors.push(`File ${index + 1}: Invalid file type. Allowed types: ${options.allowedTypes.join(', ')}`)
      }
      
      // Check file size
      if (options.maxSizeInMB && !validateFileSize(file, options.maxSizeInMB)) {
        errors.push(`File ${index + 1}: File size exceeds ${options.maxSizeInMB}MB limit`)
      }
    })
    
    return {
      valid: errors.length === 0,
      errors
    }
  }

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Get file extension
  const getFileExtension = (filename: string): string => {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2)
  }

  // Clear error
  const clearError = () => {
    error.value = null
  }

  // Reset upload state
  const resetUploadState = () => {
    isUploading.value = false
    uploadProgress.value = { loaded: 0, total: 0, percentage: 0 }
    error.value = null
  }

  return {
    // State
    isUploading: readonly(isUploading),
    uploadProgress: readonly(uploadProgress),
    error: readonly(error),
    
    // Actions
    uploadFiles,
    uploadFile,
    uploadBlob,
    
    // Validation
    validateFiles,
    validateFileType,
    validateFileSize,
    
    // Utilities
    formatFileSize,
    getFileExtension,
    clearError,
    resetUploadState
  }
} 