#include "GalDSP.h"
#include <array>
#include <atomic>
#include <cmath>
#include <cstdint>
#include <new>
struct GalGenerator {
 double rate, frequency, amplitude, phase=0, envelope=0;
 int waveform;
 std::atomic<bool> stopping{false};
 uint32_t seed=0x74ca1923, counter=0;
 std::array<double,16> rows{};
 double sum=0;
 double random() { seed ^= seed<<13; seed ^= seed>>17; seed ^= seed<<5; return double(seed)/4294967295.0*2-1; }
};
extern "C" GalGenerator *gal_generator_create(double rate,int waveform,double frequency,double level) {
 if(!std::isfinite(rate)||rate<40000||rate>192000||waveform<0||waveform>2||
    !std::isfinite(frequency)||frequency<20||frequency>20000||frequency>=rate/2||
    !std::isfinite(level)||level < -80||level > -6) return nullptr;
 auto *g=new(std::nothrow) GalGenerator;
 if(!g) return nullptr;
 g->rate=rate;g->frequency=frequency;g->waveform=waveform;g->amplitude=std::pow(10,level/20);
 for(auto &row:g->rows){row=g->random();g->sum+=row;}
 return g;
}
extern "C" void gal_generator_render(GalGenerator *g,float *output,size_t frames) {
 if(!g||!output) return;
 const double step=1/(g->rate*.02), phaseStep=2*3.14159265358979323846*g->frequency/g->rate;
 for(size_t i=0;i<frames;i++) {
  const bool stopping=g->stopping.load(std::memory_order_relaxed);
  g->envelope=stopping?std::fmax(0,g->envelope-step):std::fmin(1,g->envelope+step);
  double value=0;
  if(g->waveform==0){value=std::sin(g->phase);g->phase+=phaseStep;if(g->phase>=2*3.14159265358979323846)g->phase-=2*3.14159265358979323846;}
  else if(g->waveform==1)value=g->random();
  else {
   // Voss-McCartney: octave-spaced random updates plus full-rate white noise.
   ++g->counter; uint32_t bits=g->counter;size_t row=0;
   while(row<16&&(bits&1)==0){++row;bits>>=1;}
   if(row<16){g->sum-=g->rows[row];g->rows[row]=g->random();g->sum+=g->rows[row];}
   value=(g->sum+g->random())/17;
  }
  output[i]=float(value*g->amplitude*g->envelope);
 }
}
extern "C" void gal_generator_stop(GalGenerator *g){if(g)g->stopping.store(true,std::memory_order_relaxed);}
extern "C" void gal_generator_destroy(GalGenerator *g){delete g;}
