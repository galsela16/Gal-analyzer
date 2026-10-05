#include "CaptureRing.h"
#include <cassert>
#include <vector>
#include <cstdlib>
#include <iostream>
int main(){
 constexpr size_t channels=6,frames=100;
 auto *r=gal_capture_ring_create(channels,128);assert(r);
 auto *b=static_cast<AudioBufferList*>(calloc(1,sizeof(AudioBufferList)+(channels-1)*sizeof(AudioBuffer)));
 b->mNumberBuffers=channels;std::vector<std::vector<float>> input(channels,std::vector<float>(frames));
 for(size_t c=0;c<channels;c++){b->mBuffers[c]={1,frames*sizeof(float),input[c].data()};}
 std::vector<float> out(frames*channels);
 for(int pass=0;pass<1000;pass++){
  for(size_t c=0;c<channels;c++)for(size_t i=0;i<frames;i++)input[c][i]=float(pass*100+i)+float(c)/8;
  assert(gal_capture_ring_write(r,b,frames)==0);
  assert(gal_capture_ring_read(r,out.data(),37)==37);
  for(size_t i=0;i<37;i++)for(size_t c=0;c<channels;c++)assert(out[i*channels+c]==input[c][i]);
  assert(gal_capture_ring_read(r,out.data(),frames)==63);
  for(size_t i=0;i<63;i++)for(size_t c=0;c<channels;c++)assert(out[i*channels+c]==input[c][i+37]);
  assert(gal_capture_ring_read(r,out.data(),1)==0);
 }
 assert(gal_capture_ring_write(r,b,100)==0);assert(gal_capture_ring_write(r,b,100)==-2);assert(gal_capture_ring_error(r)==-2);
 gal_capture_ring_destroy(r);free(b);std::cout<<"Native ring: channel order, wraparound, partial reads and overflow passed.\n";
}
