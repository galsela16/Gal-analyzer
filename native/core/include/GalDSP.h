#ifndef GAL_DSP_H
#define GAL_DSP_H
#include <stddef.h>
#ifdef __cplusplus
extern "C" {
#endif
// A true 0 dBFS peak is represented by a normalized sample of magnitude 1.
typedef struct { double rms_dbfs; double peak_dbfs; size_t band_count; } GalAnalysis;
size_t gal_band_count(int bands_per_octave);
// Samples must contain a power-of-two number of elements. Returns 0 on success.
int gal_analyze(const float *samples, size_t count, double sample_rate,
                int bands_per_octave, double *band_frequencies, double *band_dbfs,
                size_t capacity, GalAnalysis *result);
#ifdef __cplusplus
}
#endif
#endif
