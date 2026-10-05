#include "CaptureRing.h"
#include <atomic>
#include <vector>
#include <new>
struct GalCaptureRing {
 size_t channels, capacity;
 std::vector<float> samples;
 std::atomic<size_t> read{0},write{0};
 std::atomic<int> error{0};
 GalCaptureRing(size_t c,size_t n):channels(c),capacity(n),samples(c*n){}
};
extern "C" GalCaptureRing *gal_capture_ring_create(size_t channels,size_t frames){
 if(!channels||channels>32||frames<128||frames>192000)return nullptr;
 try{return new GalCaptureRing(channels,frames);}catch(...){return nullptr;}
}
extern "C" void gal_capture_ring_destroy(GalCaptureRing *r){delete r;}
extern "C" void gal_capture_ring_fail(GalCaptureRing *r,int error){if(r)r->error.store(error,std::memory_order_relaxed);}
extern "C" int gal_capture_ring_error(GalCaptureRing *r){return r?r->error.load(std::memory_order_relaxed):-1;}
extern "C" int gal_capture_ring_write(GalCaptureRing *r,const AudioBufferList *buffers,size_t frames){
 if(!r||!buffers||buffers->mNumberBuffers!=r->channels)return -1;
 const size_t w=r->write.load(std::memory_order_relaxed),rd=r->read.load(std::memory_order_acquire);
 if(frames>r->capacity-(w-rd)){gal_capture_ring_fail(r,-2);return -2;}
 for(size_t c=0;c<r->channels;c++)if(!buffers->mBuffers[c].mData||buffers->mBuffers[c].mNumberChannels!=1||buffers->mBuffers[c].mDataByteSize<frames*sizeof(float)){gal_capture_ring_fail(r,-3);return -3;}
 for(size_t i=0;i<frames;i++)for(size_t c=0;c<r->channels;c++)r->samples[((w+i)%r->capacity)*r->channels+c]=static_cast<const float*>(buffers->mBuffers[c].mData)[i];
 r->write.store(w+frames,std::memory_order_release);return 0;
}
extern "C" size_t gal_capture_ring_read(GalCaptureRing *r,float *out,size_t frames){
 if(!r||!out)return 0;
 const size_t rd=r->read.load(std::memory_order_relaxed),w=r->write.load(std::memory_order_acquire);
 frames=std::min(frames,w-rd);
 for(size_t i=0;i<frames;i++)for(size_t c=0;c<r->channels;c++)out[i*r->channels+c]=r->samples[((rd+i)%r->capacity)*r->channels+c];
 r->read.store(rd+frames,std::memory_order_release);return frames;
}
