#include "GalDSP.h"
#include <algorithm>
#include <cmath>
#include <iostream>
#include <stdexcept>
#include <vector>
static void check(bool ok,const char *text){if(!ok)throw std::runtime_error(text);}
static double rms(const std::vector<float>& data){double sum=0;for(float x:data)sum+=x*x;return 10*std::log10(sum/data.size());}
int main(){
 constexpr size_t n=16384;
 for(double rate:{44100.,48000.,96000.})for(int wave:{0,1,2}){
  auto *g=gal_generator_create(rate,wave,1000,-30);check(g!=nullptr,"Valid generator rejected");
  std::vector<float> data(n);gal_generator_render(g,data.data(),n);
  for(float x:data)check(std::isfinite(x)&&std::abs(x)<=std::pow(10,-30./20)+1e-7,"Peak ceiling violated");
  gal_generator_render(g,data.data(),n);
  if(wave==0)check(std::abs(rms(data)+33.0103)<.02,"Sine RMS incorrect");
  if(wave==1)check(std::abs(rms(data)+34.7712)<.2,"White noise RMS incorrect");
  gal_generator_stop(g);gal_generator_render(g,data.data(),n);
  for(size_t i=size_t(rate*.02)+1;i<n;i++)check(data[i]==0,"Fade-out did not reach silence");
  gal_generator_destroy(g);
 }
 // Exact partition independence: callback sizes must not change phase, noise or fade.
 for(int wave:{0,1,2}){
  auto *a=gal_generator_create(48000,wave,997,-20);auto *b=gal_generator_create(48000,wave,997,-20);
  std::vector<float> whole(n),parts(n);gal_generator_render(a,whole.data(),n);
  for(size_t pos=0;pos<n;){size_t count=std::min(size_t(137),n-pos);gal_generator_render(b,parts.data()+pos,count);pos+=count;}
  check(whole==parts,"Callback size changes waveform");gal_generator_destroy(a);gal_generator_destroy(b);
 }
 // Pink noise has approximately equal energy per octave; white rises with octave width.
 for(int wave:{1,2}){
  auto *g=gal_generator_create(48000,wave,1000,-20);std::vector<float> data(n);std::vector<double> frequencies(128),levels(128),power(128,0);GalAnalysis result{};
  gal_generator_render(g,data.data(),n);
  for(int block=0;block<64;block++){
   gal_generator_render(g,data.data(),n);check(gal_analyze(data.data(),n,48000,3,frequencies.data(),levels.data(),128,&result)==0,"Noise analysis failed");
   for(size_t i=0;i<result.band_count;i++)power[i]+=std::pow(10,levels[i]/10);
  }
  double low=0,high=0;for(size_t i=0;i<result.band_count;i++){if(frequencies[i]>=200&&frequencies[i]<400)low+=power[i];if(frequencies[i]>=3200&&frequencies[i]<6400)high+=power[i];}
  double rise=10*std::log10(high/low);
  check(wave==1?rise>10&&rise<14:std::abs(rise)<3.5,"Noise spectral slope incorrect");
  gal_generator_destroy(g);
 }
 for(double bad:{double(NAN),double(INFINITY),-100.0,0.0})check(gal_generator_create(bad,0,1000,-30)==nullptr,"Invalid sample rate accepted");
 check(!gal_generator_create(48000,0,0,-30)&&!gal_generator_create(48000,3,1000,-30)&&!gal_generator_create(48000,0,1000,0),"Invalid settings accepted");
 std::cout<<"Generator passed: levels/ceilings at three rates, pink/white spectra, callback continuity, fade to silence and invalid settings.\n";
}
