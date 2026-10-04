#include "GalDSP.h"
#include <algorithm>
#include <cmath>
#include <iostream>
#include <stdexcept>
#include <vector>
void check(bool condition,const char *message){if(!condition)throw std::runtime_error(message);}
int main(){
 constexpr size_t count=16384;constexpr double pi=3.14159265358979323846;
 std::vector<float> signal(count);std::vector<double> frequencies(512),levels(512);GalAnalysis result{};
 for(const double sampleRate:{44100.0,48000.0,96000.0}){
  const double frequency=sampleRate*512/count;
  for(const double peakDb:{-6.0,-20.0,-60.0}){
   const double amplitude=std::pow(10,peakDb/20);
   for(size_t i=0;i<count;i++)signal[i]=float(amplitude*std::sin(2*pi*512*i/count));
   for(const int bpo:{3,6,12,24,48}){
    check(gal_analyze(signal.data(),count,sampleRate,bpo,frequencies.data(),levels.data(),levels.size(),&result)==0,"Analysis failed");
    check(std::abs(result.rms_dbfs-(peakDb-10*std::log10(2)))<.001,"Incorrect RMS dBFS");
    check(std::abs(result.peak_dbfs-peakDb)<.001,"Incorrect peak dBFS");
    const auto max=std::max_element(levels.begin(),levels.begin()+result.band_count);const size_t band=max-levels.begin();
    check(std::abs(std::log2(frequencies[band]/frequency))<1.0/bpo,"Incorrect RTA tone frequency");
    check(*max<=result.rms_dbfs+.001,"Band power exceeds total tone power");
    double sum=0;for(size_t i=0;i<result.band_count;i++)sum+=std::pow(10,levels[i]/10);
    check(std::abs(10*std::log10(sum)-result.rms_dbfs)<.02,"Octave integration loses spectral power");
   }
  }
 }
 std::fill(signal.begin(),signal.end(),0);check(gal_analyze(signal.data(),count,48000,48,frequencies.data(),levels.data(),512,&result)==0,"Silence rejected");
 check(result.rms_dbfs==-120&&result.peak_dbfs==-120,"Silence must produce stable floor");check(gal_band_count(48)==479,"Incorrect 1/48 band count");
 check(gal_analyze(signal.data(),1000,48000,48,frequencies.data(),levels.data(),512,&result)==-1,"Invalid FFT length accepted");
 check(gal_analyze(signal.data(),count,48000,7,frequencies.data(),levels.data(),512,&result)==-1,"Unsupported resolution accepted");
 std::cout<<"Native DSP passed: 45 sine/resolution cases, three sample rates, power conservation, silence and invalid inputs.\n";
}
