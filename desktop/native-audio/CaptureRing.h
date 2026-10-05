#pragma once
#include <stddef.h>
#include <AudioToolbox/AudioToolbox.h>
#ifdef __cplusplus
extern "C" {
#endif
typedef struct GalCaptureRing GalCaptureRing;
GalCaptureRing *gal_capture_ring_create(size_t channels, size_t capacity_frames);
void gal_capture_ring_destroy(GalCaptureRing *ring);
int gal_capture_ring_write(GalCaptureRing *ring, const AudioBufferList *buffers, size_t frames);
size_t gal_capture_ring_read(GalCaptureRing *ring, float *interleaved, size_t frames);
void gal_capture_ring_fail(GalCaptureRing *ring, int error);
int gal_capture_ring_error(GalCaptureRing *ring);
#ifdef __cplusplus
}
#endif
